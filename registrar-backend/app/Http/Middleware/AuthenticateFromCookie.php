<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuthenticateFromCookie
 *
 * WHY THIS EXISTS
 * ---------------
 * Login sets an HttpOnly cookie named "token" whose value is a raw Sanctum
 * personal-access token (e.g. "1601|abc...").  The frontend sends every
 * request with withCredentials: true, so that cookie arrives on the wire.
 *
 * Sanctum's token guard reads ONLY the Authorization: Bearer header — it
 * never inspects a cookie named "token".  Sanctum's *stateful* (SPA cookie)
 * guard reads a Laravel session cookie, which is a completely different
 * mechanism and is not used here.
 *
 * Result without this middleware: the token is present but invisible to
 * Sanctum → every authenticated request returns 401.
 *
 * FIX
 * ---
 * Before Sanctum runs, if there is no Bearer header but there IS a "token"
 * cookie, inject the cookie value as the Authorization header.  Sanctum then
 * finds it normally, validates it against personal_access_tokens, and
 * authenticates the user.
 *
 * SECURITY NOTE
 * -------------
 * The cookie is HttpOnly (JS cannot read it) and is already travelling over
 * the wire — we are only promoting it to a header that the server reads.
 * No information is exposed to the client that wasn't already there.
 * Ensure the cookie is also Secure + SameSite=Lax (set in AuthController).
 */
class AuthenticateFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only act when there is no Bearer header already (e.g. a machine
        // client that sends Authorization directly should not be overwritten).
        if (! $request->bearerToken() && $token = $request->cookie('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
