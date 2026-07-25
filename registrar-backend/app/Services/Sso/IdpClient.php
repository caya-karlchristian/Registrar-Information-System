<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Low-level HTTP client for the Identity Provider.
 *
 * Responsible for:
 *   - Exchanging an OAuth code for an access token
 *   - Fetching /me profile
 *   - Credential-based login  (email + password → code → token)
 *   - Admin CRUD operations   (create / update / delete IdP users)
 *   - Logout
 *
 * All IdP HTTP calls live here. Nothing else should use curl for the IdP.
 */
class IdpClient
{
    private string $baseUrl = '';
    private string $clientId = '';
    private string $clientSecret = '';

    public function __construct()
    {
        $this->baseUrl = config('sso.base_url', '');
        $this->clientId     = config('sso.client_id', '');
        $this->clientSecret = config('sso.client_secret', '');
    }

    // -------------------------------------------------------------------------
    // Auth flows
    // -------------------------------------------------------------------------

    /**
     * Step 1 of the credential flow: POST credentials → receive redirect URL
     * containing an OAuth code.
     *
     * Returns the raw code string.
     *
     * @throws IdpException
     */
    public function loginAndGetCode(string $email, string $password): string
    {
        [$body, $status] = $this->post('/api/v1/auth/login', [
            'client_id' => $this->clientId,
            'email'     => $email,
            'password'  => $password,
        ]);

        Log::info('SSO: credential login attempt', ['http_code' => $status, 'email' => $email]);

        if ($status !== 200) {
            throw new IdpException('Invalid credentials.', 401);
        }

        $redirectUrl = trim($body, '"');
        parse_str(parse_url($redirectUrl, PHP_URL_QUERY), $params);
        $code = $params['code'] ?? null;

        if (!$code) {
            Log::error('SSO: no code in redirect', ['body' => $body]);
            throw new IdpException('SSO login failed — no authorization code received.', 500);
        }

        return $code;
    }

    /**
     * Exchange an OAuth code for an access token.
     *
     * @throws IdpException
     */
    public function exchangeCode(string $code): string
    {
        [$body, $status] = $this->post('/api/v1/auth/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code'          => $code,
        ]);

        Log::info('SSO: token exchange', ['http_code' => $status]);

        $data        = json_decode($body, true) ?? [];
        $accessToken = $data['access_token'] ?? null;

        if ($status !== 200 || !$accessToken) {
            throw new IdpException('Authentication failed — token exchange rejected.', 401);
        }

        return $accessToken;
    }

    /**
     * Fetch the authenticated user's profile from /me.
     *
     * @throws IdpException
     */
    public function fetchUserProfile(string $accessToken): array
    {
        [$body, $status] = $this->get('/api/v1/me', $accessToken);

        Log::info('SSO: /me', ['http_code' => $status]);

        if ($status !== 200) {
            throw new IdpException('Failed to fetch user profile from identity provider.', 500);
        }

        $profile = json_decode($body, true) ?? [];

        if (empty($profile['email'])) {
            throw new IdpException('Invalid profile returned by identity provider.', 500);
        }

        return $profile;
    }

    /**
     * Logout a user from the IdP.
     */
    public function logout(string $accessToken, ?string $userId): void
    {
        if (!$userId) {
            Log::warning('SSO: logout skipped — no user_id');
            return;
        }

        
        [$body, $status, $error] = $this->postWithAuth('/api/v1/auth/logout', [
            'client_id' => $this->clientId,
            'user_id'   => $userId,
        ], $accessToken);
            
        $url = $this->baseUrl . '/logout?' . http_build_query([
            'client_id' => $this->clientId,
            'user_id'   => $userId,
        ]);

        Log::info('SSO: IdP logout called', [
            'user_id'     => $userId,
            'http_status' => $status,
            'response'    => $body,
            'curl_error'  => $error ?: null,
        ]);

        if ($error || ($status >= 400 && $status !== 401)) {
            throw new IdpException('IdP logout failed: ' . ($error ?: $body));
        }
    }

    // -------------------------------------------------------------------------
    // Admin user management (used by AdminUserService)
    // -------------------------------------------------------------------------

    /**
     * Obtain a super-admin token for admin management operations.
     *
     * @throws IdpException
     */
    public function getSuperAdminToken(): string
    {
        return $this->fetchSuperAdminToken(retried: false);
    }

    /**
     * Internal: fetch (or refresh) the cached super-admin token.
     *
     * On a 401 the cached token has been revoked or expired before our
     * 55-minute TTL (e.g. IdP restart, password rotation). We bust the cache
     * key and authenticate once more. The `retried` guard prevents an infinite
     * loop if the IdP rejects even a fresh token.
     */
    private function fetchSuperAdminToken(bool $retried): string
    {
        try {
            // Cache slightly under the typical 1-hour OAuth token lifetime
            // to avoid a login round-trip on every admin operation.
            return Cache::remember('idp:superadmin_token', 55 * 60, function () {
                $code = $this->loginAndGetCode(
                    config('sso.superadmin_email'),
                    config('sso.superadmin_password')
                );
                return $this->exchangeCode($code);
            });
        } catch (IdpException $e) {
            // Only retry when we haven't already done so — prevents infinite loops.
            if (!$retried) {
                Log::warning('SSO: super-admin token invalid, busting cache and retrying once.', [
                    'error' => $e->getMessage(),
                ]);
                Cache::forget('idp:superadmin_token');
                return $this->fetchSuperAdminToken(retried: true);
            }
            throw $e;
        }
    }

    /**
     * Create a user in the IdP. Returns the new user's IdP UUID.
     *
     * Contract verified against a captured browser request from the IdP's
     * own "New User" wizard (DevTools → Network → Payload):
     *   {
     *     email, first_name, middle_name, last_name, name_suffix,
     *     password, status: "active",
     *     account_type_id: 1,      // "System Administrator" in the wizard
     *     role_id: 4,              // IdP-internal role tier — NOT the same
     *                              // thing as SystemUser::ROLE_* (RIS's own
     *                              // local role_id column)
     *     allowed_appclients: ["<client-uuid>", ...],
     *   }
     *
     * There is no `role`/`roles` string field at all — my earlier attempts
     * at that were wrong. Two values below are still best-effort and NOT
     * yet confirmed against IdP source of truth (see inline notes):
     *   - `account_type_id` / `role_id` — assumed fixed at 1 / 4 for every
     *     RIS admin/superadmin, mirroring the captured "test system admin"
     *     request. Unconfirmed whether the IdP distinguishes RIS admin vs
     *     superadmin here at all (its wizard has no role picker — only
     *     account type + password), or whether 4 is specific to that one
     *     test account.
     *   - `allowed_appclients` — without this, previously-created accounts
     *     may exist in the IdP but have no access to log into RIS at all.
     *     Sends RIS's own `sso.client_id` so the created admin can
     *     actually authenticate against this app.
     *
     * @throws IdpException
     *
     * ⚠️ TEMPORARY: $adminToken is nullable and currently unused (passed as
     * null from AdminUserService::create()). The IdP's /api/v1/user endpoint
     * does not actually enforce the superadmin bearer token it's documented
     * to require — it accepts requests carrying only a valid x-api-key.
     * Access control for admin creation currently rests entirely on that
     * static key. Revert this once the IdP fixes bearer-token enforcement
     * — see IdpClient class docblock.
     */
    public function createUser(array $data, ?string $adminToken = null): ?string
    {
        [$body, $status] = $this->postWithAuth('/api/v1/user', [
            'email'              => $data['email'],
            'first_name'         => $data['first_name'],
            'middle_name'        => $data['middle_name'] ?? '',
            'last_name'          => $data['last_name'],
            'name_suffix'        => $data['name_suffix'] ?? '',
            'password'           => $data['password'],
            'account_type_id'    => $data['account_type_id'],
            'role_id'            => $data['idp_role_id'],
            'allowed_appclients' => [config('sso.client_id')],
            'status'             => 'active',
        ], $adminToken, withApiKey: true);

        if ($status >= 400) {
            throw new IdpException('Failed to create user in identity provider: ' . $body, 500);
        }

        $created = json_decode($body, true) ?? [];

        // Some IdP responses may embed the id directly — keep this as the
        // first check for forward/backward compatibility.
        if (!empty($created['id'])) {
            return $created['id'];
        }
        if (!empty($created['user']['id'])) {
            return $created['user']['id'];
        }

        // The actual contract: the UUID is embedded in a human-readable
        // `message` string, e.g. "Created user with the id <uuid>".
        if (!empty($created['message']) && preg_match(
            '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i',
            $created['message'],
            $matches
        )) {
            return $matches[0];
        }

        // Last-resort fallback: search by email using server-side filtering
        // to avoid scanning a fixed page and missing newly created users.
        $query = http_build_query(['email' => $data['email'], 'per_page' => 1]);
        [$listBody, $listStatus] = $this->getWithAuth("/api/v1/user?{$query}", $adminToken);

        if ($listStatus === 200) {
            $users = json_decode($listBody, true)['users'] ?? [];
            foreach ($users as $u) {
                if ($u['email'] === $data['email']) {
                    return $u['id'];
                }
            }
        }

        Log::warning('IdpClient: could not resolve UUID for newly created user', ['email' => $data['email']]);
        throw new IdpException('User was created in IdP but UUID could not be resolved. Check IdP manually.');
    }

    /**
     * Update a user's status in the IdP.
     *
     * @throws IdpException
     */
    public function updateUserStatus(string $idpUserId, string $status, string $adminToken): void
    {
        [$body, $code] = $this->patchWithAuth(
            "/api/v1/user/{$idpUserId}/status",
            ['new_status' => $status],
            $adminToken,
            withApiKey: true
        );

        if ($code >= 400) {
            throw new IdpException("Failed to update user status in IdP: {$body}");
        }
    }

    /**
     * Update a user's password in the IdP.
     *
     * @throws IdpException
     */
    public function updateUserPassword(string $idpUserId, string $newPassword, string $adminToken): void
    {
        [$body, $code] = $this->patchWithAuth(
            "/api/v1/user/{$idpUserId}/password",
            ['new_password' => $newPassword],
            $adminToken,
            withApiKey: true
        );

        if ($code >= 400) {
            throw new IdpException("Failed to update user password in IdP: {$body}");
        }
    }

    /**
     * Delete a user from the IdP.
     */
    public function deleteUser(string $idpUserId, ?string $adminToken = null): void
    {
        [$body, $code] = $this->deleteRequest("/api/v1/user/{$idpUserId}", $adminToken, withApiKey: true);

        if ($code >= 400) {
            Log::warning('SSO: IdP user delete failed', ['idp_user_id' => $idpUserId, 'body' => $body]);
        }
    }

    // -------------------------------------------------------------------------
    // Internal HTTP helpers
    // -------------------------------------------------------------------------

    private function post(string $path, array $payload): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function get(string $path, string $token): array
    {
        $ch = $this->buildGet($this->baseUrl . $path, $token);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function postWithAuth(string $path, array $payload, ?string $token, bool $withApiKey = false): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => $this->buildHeaders($token, $withApiKey),
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    /**
     * Standard JSON + bearer-token headers, optionally with the `x-api-key`
     * header the IdP's /api/v1/user endpoints additionally require.
     *
     * $token is nullable: when absent (or empty), no Authorization header is
     * sent at all — used for the create-admin call, which currently only
     * needs the x-api-key. See createUser() docblock for why.
     */
    private function buildHeaders(?string $token, bool $withApiKey = false): array
    {
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        if (!empty($token)) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }

        $apiKey = config('sso.api_key', '');
        if ($withApiKey && !empty($apiKey)) {
            $headers[] = 'x-api-key: ' . $apiKey;
        }

        return $headers;
    }

    private function getWithAuth(string $path, string $token): array
    {
        return $this->get($path, $token);
    }

    private function patchWithAuth(string $path, array $payload, string $token, bool $withApiKey = false): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => $this->buildHeaders($token, $withApiKey),
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function deleteRequest(string $path, ?string $token, bool $withApiKey = false): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_HTTPHEADER     => array_values(array_filter(
                $this->buildHeaders($token, $withApiKey),
                fn ($h) => !str_starts_with($h, 'Content-Type:')
            )),
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function buildGet(string $url, string $token): \CurlHandle
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);
        return $ch;
    }

    /** @var bool  True when the last cURL call failed with a connectivity error. */
    private bool $lastConnectivityError = false;

    /**
     * Returns true if the most recent HTTP call failed because the IDP
     * was unreachable (DNS, connection refused, timeout), not because of
     * a 4xx/5xx response.  SsoAuthService uses this to decide whether
     * to fall back to local auth.
     */
    public function lastErrorWasConnectivity(): bool
    {
        return $this->lastConnectivityError;
    }

    private function execRaw($ch): array
    {
        $url    = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        $errno  = curl_errno($ch);
        curl_close($ch);

        // Mark connectivity errors: cURL error codes that indicate the host
        // was unreachable (not an application-level HTTP error).
        $connectivityErrors = [
            CURLE_COULDNT_RESOLVE_HOST,  // DNS failure
            CURLE_COULDNT_CONNECT,       // connection refused / port closed
            CURLE_OPERATION_TIMEDOUT,    // connect or read timeout
            CURLE_SSL_CONNECT_ERROR,     // TLS handshake failed
        ];
        $this->lastConnectivityError = in_array($errno, $connectivityErrors, true);

        // Previously $error/$errno were captured but every caller only
        // destructured [$body, $status], silently discarding the real
        // cURL failure reason. That left transport-level failures (DNS,
        // connection refused, timeout, TLS handshake) producing an empty
        // $body and a callsite exception message like "...: " with
        // nothing after the colon — no way to diagnose from logs alone.
        // Log it here, once, centrally, for every caller.
        if ($errno !== 0 || $status === 0) {
            Log::error('IdpClient: transport-level request failure', [
                'url'    => $url,
                'errno'  => $errno,
                'error'  => $error,
                'status' => $status,
            ]);
        }

        return [$body, $status, $error];
    }
}