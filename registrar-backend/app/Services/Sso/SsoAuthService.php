<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates all SSO authentication flows.
 *
 * - loginWithCredentials: authenticates against the IdP, provisions
 *   the local user, issues a Sanctum token, and writes an audit log.
 * - logout: revokes the IdP token, deletes Sanctum tokens, writes
 *   an audit log, and returns the IdP logout URL for the frontend.
 *
 * AuthController stays a thin HTTP adapter — no IdP calls or
 * audit logs happen there.
 */
class SsoAuthService
{
    public function __construct(
        private IdpClient            $idpClient,
        private UserProvisioningService $provisioner,
    ) {}


    /**
     * Authenticate via OAuth authorization code (SSO redirect flow).
     *
     * @return array{token: string, user: SystemUser}
     * @throws \App\Exceptions\IdpException|\RuntimeException
     */
    public function loginWithCode(string $code, \Illuminate\Http\Request $request): array
    {
        $accessToken = $this->idpClient->exchangeCode($code);
        $profile     = $this->idpClient->fetchUserProfile($accessToken);
        $idpResponse = array_merge($profile, ["access_token" => $accessToken]);
        $result      = $this->provisioner->provision($idpResponse);
        $user        = $result->user;
        if ($result->wasRejected()) {
            throw new \RuntimeException($result->rejectionReason(), 403);
        }
        $user->update([
            "idp_access_token" => $accessToken,
            "idp_user_id"      => $profile["id"] ?? $user->idp_user_id,
        ]);
        $token = $user->createToken("sanctum")->plainTextToken;
        \App\Services\AuditLogger::log($request, $user, \App\Models\AuditLog::ACTION_LOGIN);
        return ["token" => $token, "user" => $user];
    }

    /**
     * Authenticate with email + password via the IdP.
     *
     * @return array{token: string, user: SystemUser}
     * @throws IdpException|\RuntimeException
     */
    public function loginWithCredentials(
        string  $email,
        string  $password,
        Request $request,
    ): array {
        $idpResponse = $this->idpClient->login($email, $password);

        $result = $this->provisioner->provision($idpResponse);

        /** @var SystemUser $user */
        $user = $result->user;

        if ($result->wasRejected()) {
            throw new \RuntimeException($result->rejectionReason(), 403);
        }

        // Persist IdP token on the local user for later logout
        $user->update([
            'idp_access_token' => $idpResponse['access_token'] ?? null,
            'idp_user_id'      => $idpResponse['user_id']      ?? $user->idp_user_id,
        ]);

        $token = $user->createToken('sanctum')->plainTextToken;

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

        return ['token' => $token, 'user' => $user];
    }

    /**
     * Log the user out.
     *
     * Revokes the IdP session (best-effort), deletes all Sanctum tokens,
     * writes an audit log, and returns the IdP logout URL.
     *
     * @return string  The IdP logout URL to redirect the frontend to.
     */
    public function logout(SystemUser $user, Request $request): string
    {
        AuditLogger::log($request, $user, AuditLog::ACTION_LOGOUT);

        if ($user->idp_access_token) {
            try {
                $this->idpClient->logout($user->idp_access_token, $user->idp_user_id);
            } catch (\Exception $e) {
                // Non-fatal — local session is still cleared below
                Log::warning('SSO: logout call failed', ['error' => $e->getMessage()]);
            }
        }

        $user->tokens()->delete();

        return config('sso.base_url') . '/logout?' . http_build_query([
            'client_id' => config('sso.client_id'),
        ]);
    }
}
