<?php

namespace App\Services;

use App\Models\SystemUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * LocalAuthService
 * ================
 * Authenticates a user purely against the local `users` table using
 * bcrypt.  No IDP call is made.
 *
 * This service is used in two scenarios:
 *
 *   1. IDP fallback — SsoAuthService::loginWithCredentials() catches an
 *      IDP connectivity exception and delegates here so staff can still
 *      log in when the identity provider is down.
 *
 *   2. Explicit local login — POST /api/auth/local-login always routes
 *      here, bypassing the IDP entirely.
 *
 * Security notes
 * --------------
 * • Passwords are stored as bcrypt hashes (cost 12, Laravel default).
 * • Only accounts with local_auth_enabled = 1 are accepted here.
 *   This prevents a user whose local hash is a random bcrypt string
 *   (set during SSO provisioning) from bypassing IDP with brute-force.
 * • Failed attempts are logged at WARNING level for audit purposes.
 * • Rate limiting is enforced at the route level (throttle:10,1).
 */
class LocalAuthService
{
    /**
     * Attempt local authentication.
     *
     * @return SystemUser  The authenticated user.
     * @throws \RuntimeException  If credentials are invalid or local auth is
     *                             not enabled for this account.
     */
    public function attempt(string $email, string $password): SystemUser
    {
        /** @var SystemUser|null $user */
        $user = SystemUser::where('email', $email)->first();

        if (!$user) {
            Log::warning('LocalAuth: user not found', ['email' => $email]);
            throw new \RuntimeException('Invalid credentials.', 401);
        }

        if (!$user->local_auth_enabled) {
            Log::warning('LocalAuth: local auth not enabled for user', [
                'user_id' => $user->user_id,
                'email'   => $email,
            ]);
            // Use the same generic message to avoid user enumeration.
            throw new \RuntimeException('Local authentication is not enabled for this account. Please use IDP login.', 403);
        }

        if (!$user->password || !Hash::check($password, $user->password)) {
            Log::warning('LocalAuth: bad password', ['user_id' => $user->user_id]);
            throw new \RuntimeException('Invalid credentials.', 401);
        }

        if ($user->status !== 'Activated') {
            Log::warning('LocalAuth: inactive account', ['user_id' => $user->user_id]);
            throw new \RuntimeException('Your account is not active. Please contact the registrar.', 403);
        }

        // Rehash transparently if the bcrypt cost has been raised since the
        // hash was created (PHP password_needs_rehash under the hood).
        if (Hash::needsRehash($user->password)) {
            $user->update(['password' => Hash::make($password)]);
        }

        return $user;
    }

    /**
     * Set (or update) a user's local password and enable local auth.
     *
     * Called by LocalAuthController@setPassword and the Artisan seeder.
     * Always uses the current bcrypt cost from config/hashing.php.
     */
    public function setPassword(SystemUser $user, string $plaintext): void
    {
        $user->update([
            'password'           => Hash::make($plaintext),
            'local_auth_enabled' => 1,
        ]);

        Log::info('LocalAuth: password set', [
            'user_id' => $user->user_id,
            'email'   => $user->email,
        ]);
    }
}
