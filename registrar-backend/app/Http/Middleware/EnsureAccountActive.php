<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Re-checks the authenticated user's `status` on EVERY request, not just
 * at login.
 *
 * WHY THIS EXISTS
 * ----------------
 * Sanctum only verifies that a token exists in personal_access_tokens and
 * hasn't expired (config('sanctum.expiration'), 24h by default) — it never
 * looks at the tokenable user's own status column. LocalAuthService checks
 * status at credential-submission time, and the SSO provisioning flow now
 * rejects a Deactivated account at login time too (see
 * UserProvisioningService::provision()) — but neither of those helps a
 * session that was already valid BEFORE an admin got deactivated. Without
 * this middleware, a deactivated admin's existing cookie/token keeps
 * working for every subsequent API call until it naturally expires.
 *
 * RIS is the source of truth for RIS access, independent of the IdP or
 * OCMS. This is the backstop layer: even if AdminUserService::update()'s
 * immediate token revocation (see its docblock) were ever skipped or
 * raced by a concurrent request, this middleware still denies the very
 * next request on the live DB row.
 *
 * Placement: added to the shared ['auth:sanctum', 'active', 'throttle:60,1']
 * group in routes/api.php so it protects every protected route in one
 * place, rather than needing to be added per-route.
 */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($user->status !== 'Activated') {
            // Belt-and-suspenders: also kill the token that got us here,
            // in case it was somehow missed by AdminUserService::update()
            // (e.g. status changed through a path other than that
            // service — direct DB edit, a future admin tool, etc.).
            $user->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'This account is no longer active in RIS. Please contact the registrar.',
            ], 403);
        }

        return $next($request);
    }
}
