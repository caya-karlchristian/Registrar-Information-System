<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
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
    private string $baseUrl;
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        $this->baseUrl      = config('sso.base_url');
        $this->clientId     = config('sso.client_id');
        $this->clientSecret = config('sso.client_secret');
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

        $url = $this->baseUrl . '/logout?' . http_build_query([
            'client_id' => $this->clientId,
            'user_id'   => $userId,
        ]);

        [$body, $status, $error] = $this->execRaw($this->buildGet($url, $accessToken));

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
        $code = $this->loginAndGetCode(
            config('sso.superadmin_email'),
            config('sso.superadmin_password')
        );
        return $this->exchangeCode($code);
    }

    /**
     * Create a user in the IdP. Returns the new user's IdP UUID.
     *
     * @throws IdpException
     */
    public function createUser(array $data, string $adminToken): ?string
    {
        [$body, $status] = $this->postWithAuth('/api/v1/users', [
            'email'       => $data['email'],
            'first_name'  => $data['first_name'],
            'last_name'   => $data['last_name'],
            'middle_name' => $data['middle_name'] ?? '',
            'password'    => $data['password'],
            'roles'       => $data['roles'],
            'status'      => 'active',
        ], $adminToken);

        if ($status >= 400) {
            throw new IdpException('Failed to create user in identity provider: ' . $body, 500);
        }

        // Fetch user list to resolve UUID
        [$listBody, $listStatus] = $this->getWithAuth('/api/v1/users?page=1', $adminToken);

        if ($listStatus === 200) {
            $users = json_decode($listBody, true)['users'] ?? [];
            foreach ($users as $u) {
                if ($u['email'] === $data['email']) {
                    return $u['id'];
                }
            }
        }

        return null;
    }

    /**
     * Update a user's status in the IdP.
     *
     * @throws IdpException
     */
    public function updateUserStatus(string $idpUserId, string $status, string $adminToken): void
    {
        [$body, $code] = $this->patchWithAuth(
            "/api/v1/users/{$idpUserId}/status",
            ['new_status' => $status],
            $adminToken
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
            "/api/v1/users/{$idpUserId}/password",
            ['new_password' => $newPassword],
            $adminToken
        );

        if ($code >= 400) {
            throw new IdpException("Failed to update user password in IdP: {$body}");
        }
    }

    /**
     * Delete a user from the IdP.
     */
    public function deleteUser(string $idpUserId, string $adminToken): void
    {
        [$body, $code] = $this->deleteRequest("/api/v1/users/{$idpUserId}", $adminToken);

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
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
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

    private function postWithAuth(string $path, array $payload, string $token): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function getWithAuth(string $path, string $token): array
    {
        return $this->get($path, $token);
    }

    private function patchWithAuth(string $path, array $payload, string $token): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        [$body, $status] = $this->execRaw($ch);
        return [$body, $status];
    }

    private function deleteRequest(string $path, string $token): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
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
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        return $ch;
    }

    private function execRaw($ch): array
    {
        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);
        return [$body, $status, $error];
    }
}
