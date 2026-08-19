<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\Policy;
use App\Models\SystemUser;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        // role_id/policy_id below reflect the session's ASSUMED role
        // (Step 3 — see SystemUser::assumedRoleId()/assumedPolicyId()),
        // which is identical to the raw users.role_id/policy_id columns
        // unless this session has switched via POST /auth/switch-role.
        $assumedRoleId   = $this->assumedRoleId();
        $assumedPolicyId = $this->assumedPolicyId();

        return [
            'user_id'  => $this->user_id,
            'email'    => $this->email,
            'role_id'  => $assumedRoleId,

            // Human-readable role name so the frontend never needs to
            // hardcode "if role_id === 3" checks — use role_name instead
            'role_name' => $this->resolveRoleName($assumedRoleId),

            // Student relations — only present if loaded
            'student_profile' => $this->whenLoaded('studentProfile'),
            'academic_record' => $this->whenLoaded('academicRecord'),

            // Alumni relation — only present if loaded
            // Will return data once alumni module is built
            'alumni_profile'  => $this->whenLoaded('alumniProfile'),

            // Admin/Super Admin relation — only present if loaded
            // Will return data once admin profile module is built
            'admin_profile'   => $this->whenLoaded('adminProfile'),

            // Flattened copies of the same admin_profile fields, so callers
            // (e.g. the account-settings form after a save) can read
            // data.first_name directly instead of reaching into
            // data.admin_profile — only present when adminProfile is loaded.
            'first_name'  => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->first_name),
            'middle_name' => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->middle_name),
            'last_name'   => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->last_name),
            'suffix'      => $this->whenLoaded('adminProfile', fn () => $this->adminProfile?->suffix),

            // Policy attachment — admin-only. Super admins always have
            // full access and never carry a policy_id (see RoleMiddleware).
            // Resolved independently of the `policy` eager-load below,
            // because that relation is bound to the raw policy_id
            // column and would show the wrong (or no) policy once a
            // session has switched to an assumed role with a different
            // one attached.
            'policy_id' => $assumedPolicyId,
            'policy'    => $this->when($assumedPolicyId !== null, function () use ($assumedPolicyId) {
                $policy = $this->relationLoaded('policy') && $this->policy?->policy_id === $assumedPolicyId
                    ? $this->policy
                    : Policy::where('policy_id', $assumedPolicyId)->first();

                return $policy ? new PolicyResource($policy) : null;
            }),

            // The module => actions map that ACTUALLY applies right now
            // (own policy, else the default policy, else nothing) — see
            // SystemUser::effectivePermissions(). This is what the
            // frontend should read to decide what to show/allow; it
            // should never re-derive this from policy_id/policy itself,
            // or the two could drift apart.
            'effective_permissions' => $this->when(
                $this->isAdmin(),
                fn () => $this->effectivePermissions()
            ),

            'status'    => $this->status,
            // Only meaningful while status === 'Pending Activation' — when
            // this passes, provisioning:expire-stale flips status to
            // 'Expired' (see Console\Commands\ExpireStaleProvisioning).
            'pending_expires_at' => $this->pending_expires_at,
            'created_at' => $this->created_at,

            // -----------------------------------------------------------
            // Work Item #3 — Admin Accounts / Student Staff Visibility.
            //
            // base_role_id/base_role_name are the account's actual,
            // permanent identity (raw users.role_id) — deliberately NOT
            // assumedRoleId(), which reflects a SESSION override and is
            // meaningless when this resource represents someone else's
            // row in a listing rather than the caller's own account. This
            // is what the Admin Accounts table shows as "Student" /
            // "Alumni" for a student-staff row, distinct from the
            // administrative role granted to them (see admin_grant below).
            'base_role_id'   => $this->role_id,
            'base_role_name' => $this->resolveRoleName($this->role_id),

            // The administrative (Admin/Super Admin) access this account
            // currently holds, wherever it comes from — see
            // resolveAdminGrant(). Null for a row that has neither an
            // admin-tier primary role nor an active admin-tier grant (this
            // resource is still usable for non-admin contexts elsewhere,
            // e.g. AuthController@me, where admin_grant is simply null for
            // a plain Student/Alumni session).
            'admin_grant' => $this->resolveAdminGrant(),
        ];
    }

    /**
     * Work Item #3 — resolves "what administrative access does this
     * account currently hold, and where does its policy actually come
     * from" — this is NOT the same question as $this->policy_id /
     * $this->policy above (which reflect the SESSION-assumed role via
     * assumedPolicyId(), and for a THIRD PARTY'S row being listed here —
     * no currentAccessToken() on this model instance — fall straight
     * through to the raw users.policy_id column).
     *
     * That raw-column fallback is exactly right for a classic Admin/Super
     * Admin (their baseline role_assignments row is kept in sync with
     * users.policy_id by RoleAssignmentService::editPolicy() — see its
     * docblock), but WRONG for a secondary "student staff" grant: a
     * Student's users.policy_id is never set (only admin-tier primary
     * accounts use that column), so the account's real Admin policy would
     * silently read as "no policy attached" without this method.
     *
     * Prefers an actual loaded admin-tier role_assignments row (covers
     * both a classic admin's live baseline row AND a secondary grant),
     * and falls back to the raw role_id/policy_id columns only when no
     * such row is loaded/active — e.g. a Deactivated classic admin whose
     * baseline row was cascade-revoked by
     * RoleAssignmentService::revokeAllForUser(). That fallback is what
     * keeps existing Registrar Staff / Super Admin rows displaying
     * exactly as they did before this work item.
     */
    private function resolveAdminGrant(): ?array
    {
        $adminTier = [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN];

        if ($this->relationLoaded('activeRoleAssignments')) {
            $assignment = $this->activeRoleAssignments
                ->whereIn('role_id', $adminTier)
                // A user could in theory hold both an Admin and a Super
                // Admin active row at once — grant()'s duplicate check is
                // scoped per role_id, not per tier. Prefer the
                // higher-privilege one for display if that ever happens.
                ->sortByDesc('role_id')
                ->first();

            if ($assignment) {
                return [
                    'role_assignment_id' => $assignment->id,
                    'role_id'            => $assignment->role_id,
                    'role_name'          => $this->resolveRoleName($assignment->role_id),
                    // True when this grant sits ON TOP OF a non-admin base
                    // identity — the actual "student staff" case this
                    // work item exists to surface.
                    'is_secondary'       => $assignment->role_id !== $this->role_id,
                    'policy'             => ($assignment->role_id === SystemUser::ROLE_ADMIN && $assignment->policy)
                        ? new PolicyResource($assignment->policy)
                        : null,
                    'granted_at'         => optional($assignment->granted_at)->toIso8601String(),
                    'expires_at'         => optional($assignment->expires_at)->toIso8601String(),
                    // Always 'Active' here — the eager-loaded relation is
                    // pre-filtered to activeRoleAssignments() — exposed
                    // anyway so the frontend never has to assume that.
                    'status'             => $assignment->status,
                ];
            }
        }

        if (in_array($this->role_id, $adminTier, true)) {
            return [
                'role_assignment_id' => null,
                'role_id'            => $this->role_id,
                'role_name'          => $this->resolveRoleName($this->role_id),
                'is_secondary'       => false,
                'policy'             => ($this->role_id === SystemUser::ROLE_ADMIN && $this->policy)
                    ? new PolicyResource($this->policy)
                    : null,
                'granted_at'         => null,
                'expires_at'         => null,
                'status'             => null,
            ];
        }

        return null;
    }

    // -------------------------------------------------------
    // Resolves role_id to a readable string.
    // Keeps frontend logic clean — check role_name, not numbers.
    // -------------------------------------------------------
    private function resolveRoleName(int $roleId): string
    {
        return match ($roleId) {
            SystemUser::ROLE_STUDENT     => 'student',
            SystemUser::ROLE_ALUMNI      => 'alumni',
            SystemUser::ROLE_ADMIN       => 'admin',
            SystemUser::ROLE_SUPER_ADMIN => 'super_admin',
            default                      => 'unknown',
        };
    }
}