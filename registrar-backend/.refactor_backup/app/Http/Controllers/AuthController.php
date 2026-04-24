<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Http\Resources\UserResource;
use App\Services\AuditLogger;
use App\Services\Sso\IdpClient;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Authentication controller.
 *
 * Handles login (credential-based), logout, and /me.
 * All SSO orchestration is delegated to SsoAuthService.
 */
class AuthController extends Controller
{
    public function __construct(
        private SsoAuthService $ssoAuthService,
        private IdpClient $idpClient,
    ) {}

    // -------------------------------------------------------------------------
    // POST /api/login
    // -------------------------------------------------------------------------
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->ssoAuthService->loginWithCredentials(
                $request->input('email'),
                $request->input('password'),
                $request
            );

            return response()->json(['token' => $result['token']]);

        } catch (IdpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 401);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/me
    // -------------------------------------------------------------------------
    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadIdentityRelations();
        return new UserResource($user);
    }

    // -------------------------------------------------------------------------
    // POST /api/logout
    // -------------------------------------------------------------------------
    public function logout(Request $request)
    {
        /** @var SystemUser $user */
        $user = $request->user();

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGOUT);

        if ($user->idp_access_token) {
            try {
                $this->idpClient->logout($user->idp_access_token, $user->idp_user_id);
            } catch (\Exception $e) {
                Log::warning('SSO: logout call failed', ['error' => $e->getMessage()]);
            }
        }

        $user->tokens()->delete();

        return response()->json([
            'logout_url' => config('sso.base_url') . '/logout?' . http_build_query([
                'client_id' => config('sso.client_id'),
            ]),
        ]);
    }
}
