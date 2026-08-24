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
            $actions = array_values(array_intersect(
                array_unique($actions),
                Policy::actionsFor($module)
            ));

            // View-dependency guard: for any module whose action
            // vocabulary includes 'View' (currently 'dashboard',
            // 'logbook'), granting any OTHER action implies View — you
            // can't coherently act on something you're not granted to
            // see. PolicyManagement.jsx already enforces this
            // client-side (checking Process/Complete auto-checks View;
            // unchecking View clears them), but that's UI-only — a raw
            // POST/PUT /policies call bypassed it, letting a policy
            // persist as e.g. dashboard => ['Process'] with no View.
            // Backfilling View here (rather than rejecting the
            // request) mirrors how the frontend already resolves the
            // same conflict, so this stays a pure sanitizer.
            if (!empty($actions) && in_array('View', Policy::actionsFor($module), true) && !in_array('View', $actions, true)) {
                $actions[] = 'View';
            }

            $sanitized[$module] = $actions;
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
     * admin's primary policy_id (SystemUser, still meaningful for
     * legacy/creation-time data — see the deprecation note on
     * users.policy_id in database/migrations/2026_08_23_000000_
     * deprecate_users_policy_id_column.php) or via a live grant
     * (RoleAssignment). Revoked/expired RoleAssignment rows are
     * historical and intentionally excluded — they don't grant this
     * policy to anyone right now.
     *
     * Work Item #2 — Admin Management Consolidation: the only remaining
     * WRITE path for users.policy_id is admin account creation
     * (AdminUserService::create()) and RoleAssignmentService::editPolicy()'s
     * baseline-row mirror — this method still has to READ it, since a
     * newly created admin can hold a policy there before their first
     * login ever creates a matching role_assignments row.
     */
    private function isInUse(Policy $policy): bool
    {
        $hasPrimaryHolders = SystemUser::where('policy_id', $policy->policy_id)->exists();

        $hasActiveAssignments = RoleAssignment::where('policy_id', $policy->policy_id)
            ->active()
            ->exists();

        return $hasPrimaryHolders || $hasActiveAssignments;
    }
}