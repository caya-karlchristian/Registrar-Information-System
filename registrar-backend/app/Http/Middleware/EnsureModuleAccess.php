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
 */
class EnsureModuleAccess
{
    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->hasModuleAccess($module)) {
            return response()->json([
                'message' => 'Forbidden — your account\'s assigned policy does not grant access to this module.',
            ], 403);
        }

        return $next($request);
    }
}