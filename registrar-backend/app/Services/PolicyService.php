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
     * persisting, then drop any ACTION token within a module that
     * isn't one that module actually recognizes. The store()/update()
     * request validation only checks shape ("is this an array of
     * arrays"), not the key or token names — this is what actually
     * keeps `permissions` limited to what EnsureModuleAccess (and the
     * frontend) know how to enforce, so a typo'd/malicious module key
     * OR action token can never silently create an ungated permission.
     *
     * Work Item #1 — Granular Per-Action Permissions: modules listed in
     * Policy::MODULE_ACTIONS (currently 'dashboard', 'logbook') may
     * grant any subset of that module's own action list, e.g.
     * `{"dashboard": ["View", "Complete"]}`. Every other module keeps
     * the original single-token behavior — its only valid granted
     * value is `["Access"]`; anything else in that array (a stray
     * 'Process' typed in by hand via a raw API call, for instance) is
     * silently dropped rather than persisted. Policy::actionsFor() is
     * the single source of truth both branches read from, so a module
     * only ever needs to be added to MODULE_ACTIONS once for both this
     * sanitizer and SystemUser::hasModuleAccess() to recognize it.
     */
    private function sanitizePermissions(array $permissions): array
    {
        $permissions = array_intersect_key($permissions, array_flip(Policy::MODULE_KEYS));

        $sanitized = [];

        foreach ($permissions as $module => $actions) {
            $actions = is_array($actions) ? $actions : [];
            $sanitized[$module] = array_values(array_intersect(
                array_unique($actions),
                Policy::actionsFor($module)
            ));
        }

        return $sanitized;
    }

    /**
     * @throws PolicyException if the policy is system-managed, or if it is
     *         currently assigned to one or more users.
     */
    public function delete(Policy $policy, Request $request): void
    {
        if ($policy->is_system) {
            throw new PolicyException('System-managed policies cannot be deleted.');
        }

        if ($this->isInUse($policy)) {
            throw new PolicyException(
                'This policy is currently assigned to one or more users and cannot be deleted. '
                . 'Reassign or detach it from those users first.'
            );
        }

        DB::transaction(function () use ($policy, $request) {
            $policy->delete();

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_POLICY_DELETED);
        });
    }

    /**
     * Whether $policy is currently attached to anyone — either as an
     * admin's primary policy_id (SystemUser) or via a live grant
     * (RoleAssignment). Mirrors the two places attachToUser() writes
     * policy_id to, so "in use" here means the same thing it means there.
     * Revoked/expired RoleAssignment rows are historical and intentionally
     * excluded — they don't grant this policy to anyone right now.
     */
    private function isInUse(Policy $policy): bool
    {
        $hasPrimaryHolders = SystemUser::where('policy_id', $policy->policy_id)->exists();

        $hasActiveAssignments = RoleAssignment::where('policy_id', $policy->policy_id)
            ->active()
            ->exists();

        return $hasPrimaryHolders || $hasActiveAssignments;
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