<?php

namespace App\Http\Middleware;

use Illuminate\Cookie\Middleware\EncryptCookies as Middleware;

/**
 * Exclude the 'token' cookie from encryption/decryption.
 *
 * WHY THIS EXISTS
 * ---------------
 * Login stores a raw plain-text Sanctum personal-access token (e.g. "1|abc…")
 * in an HttpOnly cookie named 'token'. Laravel's EncryptCookies middleware
 * runs globally and tries to decrypt every inbound cookie. Because 'token'
 * was never encrypted to begin with, decryption throws:
 *
 *     Illuminate\Encryption\MissingAppKeyException  — OR —
 *     Illuminate\Contracts\Encryption\DecryptException: "The payload is invalid."
 *
 * DecryptException extends RuntimeException. SsoCallbackController has a
 * catch(\RuntimeException) block that returns a 403, so every SSO login
 * fails with a 403 even for users who exist in the database.
 *
 * The 'token' cookie does NOT need encryption — it is already protected by:
 *   • HttpOnly  (JavaScript cannot read it)
 *   • Secure    (HTTPS only)
 *   • SameSite=Lax  (blocks cross-site POST forgery)
 *   • Server-side validation against personal_access_tokens table on every request
 *
 * Excluding it from EncryptCookies removes the redundant (and breaking)
 * decrypt attempt without reducing security in any meaningful way.
 */
class EncryptCookies extends Middleware
{
    /**
     * Cookies that should not be encrypted.
     *
     * @var array<int, string>
     */
    protected $except = [
        'token',
    ];
}
