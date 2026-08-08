<?php

namespace App\Services;

use App\Exceptions\PolicyException;
use App\Models\AuditLog;
use App\Models\Policy;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Owns the "User Management — Policy Attachment" feature end to end:
 * policy CRUD plus attaching/detaching a policy to an admin account.
 *
 * Mirrors AdminUserService's shape — a thin, audit-logging service layer
 * so controllers stay simple HTTP adapters. All mutations are wrapped in
 * DB transactions for the same reason AdminUserService wraps its writes:
 * a policy attachment and its audit-log row must succeed or fail together.
 */
class PolicyService
{
    /**
     * Alias kept for readability at call sites / docblocks that predate
     * the constant living on the model — always resolves to
     * Policy::DEFAULT_NAME so there is still only one literal value.
     */
    public const DEFAULT_POLICY_NAME = Policy::DEFAULT_NAME;

    public function __construct(private AuditLogger $auditLogger) {}

    // -------------------------------------------------------------------------
    // Policy CRUD
    // -------------------------------------------------------------------------

    public function list()
    {
        return Policy::withCount('users')->orderBy('name')->get();
    }

    public function create(array $validated, Request $request): Policy
    {
        return DB::transaction(function () use ($validated, $request) {
            $policy = Policy::create([
                'name'        => $validated['name'],
                'permissions' => $this->sanitizePermissions($validated['permissions'] ?? []),
                // Policies created through the API are always custom —
                // only the two seeded defaults are is_system = true.
                'is_system'   => false,
            ]);

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_POLICY_CREATED);

            return $policy;
        });
    }

    public function update(Policy $policy, array $validated, Request $request): Policy
    {
        return DB::transaction(function () use ($policy, $validated, $request) {
            $fields = array_filter([
                'name'        => $validated['name'] ?? null,
                'permissions' => array_key_exists('permissions', $validated)
                    ? $this->sanitizePermissions($validated['permissions'])
                    : null,
            ], fn ($v) => !is_null($v));

            if (!empty($fields)) {
                $policy->update($fields);
            }

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_POLICY_UPDATED);

            return $policy->fresh();
        });
    }

    /**
     * Drop any module key that isn't in Policy::MODULE_KEYS before
     * persisting. The store()/update() request validation only checks
     * shape ("is this an array of arrays"), not the key names — this
     * is what actually keeps `permissions` limited to modules the
     * EnsureModuleAccess middleware (and the frontend) know how to
     * enforce, so a typo'd or malicious key can never silently create
     * an ungated "module".
     */
    private function sanitizePermissions(array $permissions): array
    {
        return array_intersect_key($permissions, array_flip(Policy::MODULE_KEYS));
    }

    /**
     * @throws PolicyException if the policy is system-managed.
     */
    public function delete(Policy $policy, Request $request): void
    {
        if ($policy->is_system) {
            throw new PolicyException('System-managed policies cannot be deleted.');
        }

        DB::transaction(function () use ($policy, $request) {
            // Admins holding this policy fall back to "no policy attached"
            // rather than being left pointing at a deleted row. The
            // frontend / attachToUser() default-resolution logic then
            // takes over the next time their access is displayed or
            // re-evaluated — same behavior the localStorage-only version
            // had when a policy name stopped existing.
            SystemUser::where('policy_id', $policy->policy_id)
                ->update(['policy_id' => null]);

            $policy->delete();

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_POLICY_DELETED);
        });
    }

    // -------------------------------------------------------------------------
    // Attach / detach — the actual "policy attachment" action for admins
    // -------------------------------------------------------------------------

    /**
     * @throws PolicyException if $user is not an admin (role_id = 3).
     */
    public function attachToUser(SystemUser $user, ?int $policyId, Request $request): SystemUser
    {
        if ($user->role_id !== SystemUser::ROLE_ADMIN) {
            throw new PolicyException(
                'Policies can only be attached to admin accounts. Super admins have full access by default.'
            );
        }

        return DB::transaction(function () use ($user, $policyId, $request) {
            $user->update(['policy_id' => $policyId]);

            // Keep this user's Active Admin role_assignments row (their
            // baseline row — see UserProvisioningService::
            // ensureBaselineRoleAssignment()) in sync with the raw
            // column we just changed. assumedPolicyId() reads a
            // role_assignments row's OWN policy_id whenever a session
            // has switched into that role (Step 3), not the raw column
            // — so for a student-staff account currently assumed as
            // Admin, leaving this row stale would silently keep
            // enforcing the OLD policy for that live session until they
            // switch away and back. This UI/method only ever targets an
            // account whose PRIMARY role is Admin (see the guard above),
            // so `role_id = ROLE_ADMIN` here is unambiguous — it is that
            // same account's own baseline row, not some other grant.
            RoleAssignment::where('user_id', $user->user_id)
                ->where('role_id', SystemUser::ROLE_ADMIN)
                ->active()
                ->update(['policy_id' => $policyId]);

            $this->auditLogger->log(
                $request,
                $request->user(),
                $policyId ? AuditLog::ACTION_POLICY_ATTACHED : AuditLog::ACTION_POLICY_DETACHED
            );

            return $user->fresh()->load(['adminProfile', 'policy']);
        });
    }
}