<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Grants and revokes role_assignments rows — the entitlement layer that
 * sits alongside (not yet replacing) users.role_id. See
 * database/migrations/2026_08_10_000000_create_role_assignments_table.php
 * for why this table exists separately.
 *
 * grant() is how a "student staff" gets onboarded: the person already
 * has a Student role_assignment (from the backfill, or from
 * UserProvisioningService::provision() on their first SSO login), and a
 * Super Admin grants them a second, Admin role_assignment with a
 * restricted policy and a bounded expires_at.
 *
 * revoke() is the deterministic "they left" offboarding path — explicit,
 * audited, and immediately session-invalidating (see the token-revocation
 * note on revoke() below). The non-deterministic "they graduated" case
 * relies on expires_at + role-assignments:expire instead, since RIS has
 * no live signal for graduation (confirmed: student_academic_record has
 * no graduation_date column, and OGOS's DTO exposes no enrollment-status
 * field) — see Console\Commands\ExpireRoleAssignments.
 */
class RoleAssignmentService
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @throws ValidationException
     */
    public function grant(array $validated, Request $request): RoleAssignment
    {
        $targetUser = SystemUser::findOrFail($validated['user_id']);

        return DB::transaction(function () use ($validated, $targetUser, $request) {
            // Enforced here rather than a DB partial-unique index (MySQL
            // has no native partial unique constraint without a generated
            // column) — the transaction + row lock below makes this safe
            // against a concurrent grant() racing for the same
            // (user_id, role_id) pair.
            $duplicate = RoleAssignment::where('user_id', $targetUser->user_id)
                ->where('role_id', $validated['role_id'])
                ->active()
                ->lockForUpdate()
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'role_id' => 'This user already holds an active assignment for that role.',
                ]);
            }

            $assignment = RoleAssignment::create([
                'user_id'    => $targetUser->user_id,
                'role_id'    => $validated['role_id'],
                // Only admins carry a policy — same convention as
                // users.policy_id / AdminUserService::create().
                'policy_id'  => $validated['role_id'] === SystemUser::ROLE_ADMIN
                    ? ($validated['policy_id'] ?? null)
                    : null,
                'status'     => RoleAssignment::STATUS_ACTIVE,
                'granted_by' => $request->user()->user_id,
                'granted_at' => now(),
                // Deliberately no fallback default here (e.g. "+1 term") —
                // that's a registrar policy decision, not a code default to
                // guess at. The frontend/caller must pass expires_at
                // explicitly; null is allowed (indefinite) but has to be a
                // deliberate choice, enforced by StoreRoleAssignmentRequest.
                'expires_at' => $validated['expires_at'] ?? null,
            ]);

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ROLE_ASSIGNED, [
                'target_user_id'      => $targetUser->user_id,
                'target_email'        => $targetUser->email,
                'role_assignment_id'  => $assignment->id,
                'role_id'             => $assignment->role_id,
                'policy_id'           => $assignment->policy_id,
                'expires_at'          => optional($assignment->expires_at)->toIso8601String(),
            ]);

            return $assignment;
        });
    }

    /**
     * Powers the "Grant a Role" picker (GET /role-assignments/search-users).
     * Searches across ALL roles by design — a grant target can be a
     * student, alumni, admin, or another super admin, unlike
     * SystemUserController::index(), which is intentionally scoped to
     * admin/super-admin accounts only.
     *
     * Uses PREFIX matching (LIKE 'term%') rather than substring
     * matching — this is what lets MySQL use the B-tree indexes added
     * in the 2026_08_12 migration instead of a full table scan, which
     * is what keeps this fast as the student roster grows into the
     * thousands. Results are capped at 10 (typeahead, not a directory
     * listing) and exclude Deactivated / Pending Activation accounts —
     * granting a role to an account that can't yet log in isn't
     * meaningful.
     */
    public function searchGrantableUsers(string $term): Collection
    {
        // Escape LIKE metacharacters in the raw user input. The query
        // builder already parameterizes this value (no SQL injection
        // risk), but an unescaped '%' or '_' typed by the admin would
        // change LIKE's matching semantics (e.g. a literal "%" alone
        // would match every row) rather than being treated as a literal
        // character to search for.
        $escaped = addcslashes($term, '%_\\');
        $prefix  = $escaped . '%';

        return SystemUser::query()
            ->where('status', 'Activated')
            ->where(function ($q) use ($prefix) {
                $q->where('email', 'like', $prefix)
                    ->orWhereHas('studentProfile', fn ($p) => $p
                        ->where('first_name', 'like', $prefix)
                        ->orWhere('last_name', 'like', $prefix))
                    ->orWhereHas('adminProfile', fn ($p) => $p
                        ->where('first_name', 'like', $prefix)
                        ->orWhere('last_name', 'like', $prefix))
                    ->orWhereHas('alumniProfile', fn ($p) => $p
                        ->where('first_name', 'like', $prefix)
                        ->orWhere('last_name', 'like', $prefix));
            })
            ->with(['studentProfile', 'adminProfile', 'alumniProfile', 'activeRoleAssignments'])
            ->orderBy('email')
            ->limit(10)
            ->get();
    }

    /**
     * Explicit offboarding: revoke a specific role assignment. Does NOT
     * touch the user's other role assignments — revoking the Admin side
     * of a student-staff account leaves their Student assignment (and
     * access) untouched, which is the whole point of separating these
     * from a single users.role_id column.
     *
     * SECURITY: revokes ALL of the user's active Sanctum tokens, not just
     * ones somehow tied to the revoked role — RIS sessions aren't
     * currently role-scoped at the token level (see AuthController /
     * SsoAuthService — every login issues one token for the account),
     * so a revoked-but-still-logged-in admin must be forced to
     * re-authenticate entirely, not just lose access to the specific
     * role client-side. This mirrors how a Deactivated account is
     * already treated (UserProvisioningService::provision() rejects it
     * outright on next login) — a revocation should take effect
     * immediately, not at the next natural token expiry.
     *
     * @throws ValidationException
     */
    public function revoke(RoleAssignment $assignment, string $reason, Request $request): RoleAssignment
    {
        if ($assignment->status !== RoleAssignment::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'status' => "This role assignment is already '{$assignment->status}' and cannot be revoked again.",
            ]);
        }

        return DB::transaction(function () use ($assignment, $reason, $request) {
            $assignment->update([
                'status'            => RoleAssignment::STATUS_REVOKED,
                'revoked_by'        => $request->user()->user_id,
                'revoked_at'        => now(),
                'revocation_reason' => $reason,
            ]);

            $targetUser = $assignment->user;
            $targetUser->tokens()->delete();

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ROLE_REVOKED, [
                'target_user_id'     => $targetUser->user_id,
                'target_email'       => $targetUser->email,
                'role_assignment_id' => $assignment->id,
                'role_id'            => $assignment->role_id,
                'reason'             => $reason,
            ]);

            return $assignment;
        });
    }

    /**
     * Step 3 — session-scoped role switching. Validates the caller
     * actually holds an Active (and not-yet-expired) assignment for
     * $roleId, then reissues the session's Sanctum token stamped with
     * that assignment's id in active_role_assignment_id.
     *
     * Reissues rather than mutating the existing token in place for the
     * same reason a fresh token is issued on login: the plaintext value
     * the browser is holding never changes meaning silently under it —
     * a new plaintext token means a new cookie write, which is the
     * honest signal to the client that its session's authority just
     * changed. RIS is already single-session-per-account (see
     * AuthController::login()'s `$user->tokens()->delete()`), so this
     * mirrors that: delete the current token, issue exactly one new
     * one carrying the same auth-method name (so logout()'s
     * sanctum-local/sanctum-idp check keeps working) plus the assumed
     * role.
     *
     * Does NOT touch other role_assignments rows or force-logout other
     * sessions — unlike revoke(), switching is a normal, expected,
     * reversible action by the account holder themselves, not an
     * offboarding event.
     *
     * @return array{assignment: RoleAssignment, token: string, token_model: \Laravel\Sanctum\PersonalAccessToken}
     * @throws ValidationException
     */
    public function switchTo(SystemUser $user, int $roleId, Request $request): array
    {
        return DB::transaction(function () use ($user, $roleId, $request) {
            $assignment = RoleAssignment::where('user_id', $user->user_id)
                ->where('role_id', $roleId)
                ->active()
                ->lockForUpdate()
                ->first();

            if (!$assignment || !$assignment->isCurrentlyActive()) {
                throw ValidationException::withMessages([
                    'role_id' => 'You do not currently hold an active assignment for that role.',
                ]);
            }

            // Preserve the auth-method marker ('sanctum-idp' /
            // 'sanctum-local') so AuthController::logout() can still
            // tell which flow to run after the switch.
            $currentToken = $user->currentAccessToken();
            $tokenName    = $currentToken?->name ?? 'sanctum-idp';

            $user->tokens()->delete();

            $newToken = $user->createToken($tokenName);
            $newToken->accessToken->forceFill([
                'active_role_assignment_id' => $assignment->id,
            ])->save();

            $this->auditLogger->log($request, $user, AuditLog::ACTION_ROLE_SWITCHED, [
                'target_user_id'      => $user->user_id,
                'target_email'        => $user->email,
                'role_assignment_id'  => $assignment->id,
                'role_id'             => $assignment->role_id,
                'policy_id'           => $assignment->policy_id,
            ]);

            return [
                'assignment'  => $assignment,
                'token'       => $newToken->plainTextToken,
                'token_model' => $newToken->accessToken,
            ];
        });
    }
}