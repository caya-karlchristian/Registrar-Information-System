<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use App\Services\AuditLogger;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates all SSO authentication flows.
 *
 * Two entry points:
 *   - loginWithCredentials()  — email/password (used by /api/login)
 *   - loginWithCode()         — OAuth callback  (used by /api/auth/callback)
 *
 * Both return the same shape: ['token', 'needs_onboarding', 'data']
 */
class SsoAuthService
{
    public function __construct(
        private IdpClient $idpClient,
        private UserProvisioningService $provisioner,
    ) {}

    /**
     * Credential-based login (email + password → code → token → profile → provision).
     *
     * @throws IdpException|\RuntimeException
     */
    public function loginWithCredentials(string $email, string $password, Request $request): array
    {
        $code        = $this->idpClient->loginAndGetCode($email, $password);
        $accessToken = $this->idpClient->exchangeCode($code);
        $profile     = $this->idpClient->fetchUserProfile($accessToken);

        return $this->provisionAndIssueToken($accessToken, $profile, $request);
    }

    /**
     * OAuth callback login (code → token → profile → provision).
     *
     * @throws IdpException|\RuntimeException
     */
    public function loginWithCode(string $code, Request $request): array
    {
        $accessToken = $this->idpClient->exchangeCode($code);
        $profile     = $this->idpClient->fetchUserProfile($accessToken);

        return $this->provisionAndIssueToken($accessToken, $profile, $request);
    }

    // -------------------------------------------------------------------------

    private function provisionAndIssueToken(string $accessToken, array $profile, Request $request): array
    {
        try {
            $result = $this->provisioner->provision($profile);
        } catch (\RuntimeException $e) {
            $this->silentIdpLogout($accessToken, $profile);
            throw $e;
        }

        $user = $result->user;

        $user->update([
            'idp_access_token' => $accessToken,
            'idp_user_id'      => $profile['id'] ?? $profile['user_id'] ?? $profile['sub'] ?? null,
        ]);

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

        $token = $user->createToken('sso')->plainTextToken;

        return [
            'token'            => $token,
            'needs_onboarding' => $result->needsOnboarding,
            'data'             => [
                'user_id'   => $user->user_id,
                'email'     => $user->email,
                'role_id'   => $user->role_id,
                'role_name' => $user->role_name ?? null,
            ],
        ];
    }

    private function silentIdpLogout(string $accessToken, array $profile): void
    {
        try {
            $userId = $profile['id'] ?? $profile['user_id'] ?? $profile['sub'] ?? null;
            $this->idpClient->logout($accessToken, $userId);
        } catch (\Exception $e) {
            Log::warning('SSO: could not kill IdP session after provision error', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
