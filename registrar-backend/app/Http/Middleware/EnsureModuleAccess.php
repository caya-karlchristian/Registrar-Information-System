<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Enforces the "User Management — Policy Attachment" feature at the
 * only place that actually matters: the API boundary.
 *
 * Usage (routes/api.php):
 *   Route::get('overview', ...)->middleware('module:analytics');
 *
 * This is deliberately separate from RoleMiddleware ('role:3,4' etc.):
 *   - RoleMiddleware answers "what kind of account is this" (student /
 *     admin / super admin) and is coarse-grained, rarely-changing.
 *   - EnsureModuleAccess answers "has this specific admin's assigned
 *     policy been granted this module", which is fine-grained and can
 *     change at any time a super admin re-attaches a policy.
 * Routes that need both keep both middleware, e.g.
 *   ->middleware(['role:3', 'module:analytics'])
 *
 * All the actual resolution logic (own policy -> default policy ->
 * deny) lives on SystemUser::hasModuleAccess() so there is exactly one
 * implementation shared with UserResource's `effective_permissions`.
 *
 * Step 3 (Multi-Role Assignments): hasModuleAccess() resolves through
 * isAdmin()/isSuperAdmin()/effectivePermissions(), which now all read
 * the session's ASSUMED role first (see SystemUser::assumedRoleId() /
 * assumedPolicyId()) — so a student-staff session that has switched to
 * its Admin grant is gated by that grant's policy here automatically,
 * with no change needed in this file.
 *
 * Work Item #1 — Granular Per-Action Permissions: this middleware is
 * ALWAYS the coarse gate only — "does the user have any of the listed
 * actions on this module at all" — never the fine-grained,
 * request-content-dependent check (e.g. "which status is this PUT
 * actually targeting"). That distinction matters because a single
 * route like PUT /document-requests/{id} handles every status
 * transition, so a static route-level tag can't know which write
 * action a given call actually needs — only DocumentRequestService::
 * updateRequest() can, once the target status is known. See that
 * file's fine-grained check.
 *
 * Optional third segment ($actions) accepts one or more action tokens
 * separated by '|' (OR semantics — ANY one grants the route):
 *   ->middleware('module:dashboard')                 // any dashboard access
 *   ->middleware('module:dashboard,View')             // must have View
 *   ->middleware('module:dashboard,Process|Complete') // must have Process OR Complete
 *
 * Omitting $actions preserves the exact pre-Work-Item-#1 behavior
 * (SystemUser::hasModuleAccess($module) with no action) — every
 * existing route tag keeps working unchanged.
 */
class EnsureModuleAccess
{
    public function handle(Request $request, Closure $next, string $module, ?string $actions = null)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->authorized($user, $module, $actions)) {
            return response()->json([
                'message' => 'Forbidden — your account\'s assigned policy does not grant access to this module.',
            ], 403);
        }

        return $next($request);
    }

    /**
     * True if the user passes the module gate: no $actions segment
     * means "any access to the module at all"; otherwise the user must
     * have at least one of the pipe-separated action tokens.
     */
    private function authorized($user, string $module, ?string $actions): bool
    {
        if ($actions === null) {
            return $user->hasModuleAccess($module);
        }

        foreach (explode('|', $actions) as $action) {
            if ($user->hasModuleAccess($module, $action)) {
                return true;
            }
        }

        return false;
    }
}