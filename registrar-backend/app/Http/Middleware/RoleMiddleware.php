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

        // Super Admin bypasses all role restrictions
        if ($user->role_id === SystemUser::ROLE_SUPER_ADMIN) {
            return $next($request);
        }

        // $roles is already a flat array from the variadic parameter.
        // Cast each element to string so in_array() comparison is type-safe.
        $allowedRoles = array_map('strval', $roles);

        if (!in_array((string) $user->role_id, $allowedRoles)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
