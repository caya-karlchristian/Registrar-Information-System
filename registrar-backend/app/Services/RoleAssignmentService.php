<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use Illuminate\Http\Request;
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
}
