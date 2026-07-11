<?php

namespace App\Services;

use App\Exceptions\PolicyException;
use App\Models\AuditLog;
use App\Models\Policy;
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
                'permissions' => $validated['permissions'] ?? [],
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
                'name'        => $validated['name']        ?? null,
                'permissions' => $validated['permissions']  ?? null,
            ], fn ($v) => !is_null($v));

            if (!empty($fields)) {
                $policy->update($fields);
            }

            $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_POLICY_UPDATED);

            return $policy->fresh();
        });
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

            $this->auditLogger->log(
                $request,
                $request->user(),
                $policyId ? AuditLog::ACTION_POLICY_ATTACHED : AuditLog::ACTION_POLICY_DETACHED
            );

            return $user->fresh()->load(['adminProfile', 'policy']);
        });
    }
}
