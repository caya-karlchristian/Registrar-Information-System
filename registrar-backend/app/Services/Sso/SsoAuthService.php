<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates all SSO authentication flows.
 *
 * - loginWithCode: OAuth redirect flow — exchanges an authorization code
 *   for a token, provisions the user, issues a Sanctum token.
 * - loginWithCredentials: authenticates against the IdP with email + password,
 *   provisions the local user, issues a Sanctum token, and writes an audit log.
 * - logout: revokes the IdP token, deletes Sanctum tokens, writes
 *   an audit log, and returns the IdP logout URL for the frontend.
 *
 * AuthController stays a thin HTTP adapter — no IdP calls or
 * audit logs happen there.
 */
class SsoAuthService
{
    public function __construct(
        private IdpClient               $idpClient,
        private UserProvisioningService $provisioner,
        private \App\Services\AuditLogger $auditLogger,
    ) {}

    /**
     * Authenticate via OAuth authorization code (SSO redirect flow).
     *
     * Rejection is handled by UserProvisioningService, which throws a
     * \RuntimeException if the user has no registered role in RIS.
     * SsoCallbackController catches that and returns a 403.
     *
     * @return array{token: string, user: SystemUser}
     * @throws IdpException|\RuntimeException
     */
    public function loginWithCode(string $code, Request $request): array
    {
        $accessToken = $this->idpClient->exchangeCode($code);
        $profile     = $this->idpClient->fetchUserProfile($accessToken);

        // provision() throws \RuntimeException if user has no role in RIS
        $result = $this->provisioner->provision(
            array_merge($profile, ['access_token' => $accessToken])
        );

        /** @var SystemUser $user */
        $user = $result->user;

        $user->update([
            'idp_access_token' => $accessToken,
            'idp_user_id'      => $profile['id'] ?? $user->idp_user_id,
        ]);

        $token = $user->createToken('sanctum')->plainTextToken;

        $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGIN);

        return ['token' => $token, 'user' => $user];
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
        $code        = $this->idpClient->loginAndGetCode($email, $password);
        $accessToken = $this->idpClient->exchangeCode($code);
        $profile     = $this->idpClient->fetchUserProfile($accessToken);
        $idpResponse = array_merge($profile, [
            'access_token' => $accessToken,
            'user_id'      => $profile['id'] ?? null,
        ]);

        $result = $this->provisioner->provision($idpResponse);
        $user   = $result->user;

        $user->update([
            'idp_access_token' => $accessToken,
            'idp_user_id'      => $profile['id'] ?? $user->idp_user_id,
        ]);

        $token = $user->createToken('sanctum')->plainTextToken;
        $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGIN);

        return ['token' => $token, 'user' => $user];
    }

    /**
     * Log the user out.
     *
     * @return string  The IdP logout URL to redirect the frontend to.
     */
    public function logout(SystemUser $user, Request $request): string
    {
        $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGOUT);

        if ($user->idp_access_token) {
            try {
                $this->idpClient->logout($user->idp_access_token, $user->idp_user_id);
            } catch (\Exception $e) {
                Log::warning('SSO: logout call failed', ['error' => $e->getMessage()]);
            }
        }

        $user->tokens()->delete();

        // post_logout_redirect_uri tells the IdP where to send the browser after
        // it clears its own session.  Without it the IdP logs:
        //   "Skipping logout API call because logout query params are incomplete."
        // and may not fully clear the IdP browser session, causing subsequent
        // SSO logins to silently reuse the old session.
        return config('sso.base_url') . '/logout?' . http_build_query([
            'client_id'                => config('sso.client_id'),
            'post_logout_redirect_uri' => config('app.url'),
        ]);
    }
}