<?php

namespace App\Http\Middleware;

use App\Models\SystemUser;
use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Read the session's ASSUMED role (Step 3 — see
        // SystemUser::assumedRoleId()), not the raw role_id column. A
        // student-staff session that has switched to Admin must pass
        // 'role:3,4' gates for that to mean anything; falling back to
        // the raw column here would make POST /auth/switch-role a
        // no-op for every route this middleware guards. Fully backward
        // compatible: assumedRoleId() returns the raw role_id whenever
        // no switch is in effect.
        $effectiveRoleId = $user->assumedRoleId();

        // Super Admin bypasses all role restrictions
        if ($effectiveRoleId === SystemUser::ROLE_SUPER_ADMIN) {
            return $next($request);
        }

        // $roles is already a flat array from the variadic parameter.
        // Cast each element to string so in_array() comparison is type-safe.
        $allowedRoles = array_map('strval', $roles);

        if (!in_array((string) $effectiveRoleId, $allowedRoles)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}