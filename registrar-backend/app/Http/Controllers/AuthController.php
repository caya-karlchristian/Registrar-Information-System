<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Exceptions\IdpUnavailableException;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Services\AuditLogger;
use App\Services\LocalAuthService;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Authentication controller.
 *
 * POST /api/login  — IDP-first with automatic local fallback.
 *
 *   1. Attempt IDP credential login via SsoAuthService.
 *   2. If the IDP is unreachable (IdpUnavailableException), automatically
 *      retry with LocalAuthService and tag the response with
 *      X-Auth-Method: local so the frontend can show an advisory banner.
 *   3. If the IDP rejects the credentials (wrong password), return 401
 *      immediately — do NOT fall through to local auth (would allow IDP
 *      password bypass).
 *
 * The explicit local-only endpoint lives in LocalAuthController.
 */
class AuthController extends Controller
{
    public function __construct(
        private SsoAuthService  $ssoAuthService,
        private LocalAuthService $localAuth,
        private AuditLogger     $auditLogger,
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

        $email    = $request->input('email');
        $password = $request->input('password');

        // ── Step 1: try the IDP ──────────────────────────────────────────────
        try {
            $result = $this->ssoAuthService->loginWithCredentials($email, $password, $request);

            $user  = $result['user'];
            $token = $result['token'];

            $user->loadIdentityRelations();

            return response()
                ->json(['user' => new UserResource($user)])
                ->header('X-Auth-Method', 'idp')
                ->cookie(
                    'token',
                    $token,
                    60 * 24 * 7,
                    '/',
                    config('session.domain'),
                    config('session.secure_cookie'),
                    true,
                    false,
                    config('session.same_site'),
                );

        } catch (IdpUnavailableException $e) {
            // IDP is down — fall through to local auth below.
            Log::warning('AuthController: IDP unreachable, attempting local fallback', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        } catch (IdpException $e) {
            // IDP responded but rejected the credentials — do NOT fall back.
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 401);
        } catch (\RuntimeException $e) {
            // Role / provisioning error from the IDP flow.
            return response()->json(['message' => $e->getMessage()], 403);
        }

        // ── Step 2: IDP was unreachable — try local auth ─────────────────────
        try {
            $user = $this->localAuth->attempt($email, $password);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() ?: 401;
            return response()->json([
                'message'     => $e->getMessage(),
                'idp_offline' => true,
            ], $code);
        }

        $user->loadIdentityRelations();
        $token = $user->createToken('sanctum')->plainTextToken;

        $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGIN);

        Log::info('AuthController: local-fallback login success', [
            'user_id' => $user->user_id,
            'email'   => $user->email,
        ]);

        return response()
            ->json([
                'user'        => new UserResource($user),
                'idp_offline' => true,  // advisory flag for the frontend
            ])
            ->header('X-Auth-Method', 'local')
            ->cookie(
                'token',
                $token,
                60 * 24 * 7,
                '/',
                config('session.domain'),
                config('session.secure_cookie'),
                true,
                false,
                config('session.same_site'),
            );
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
        $logoutUrl = $this->ssoAuthService->logout($request->user(), $request);

        return response()
            ->json(['logout_url' => $logoutUrl])
            ->withCookie(\Illuminate\Support\Facades\Cookie::make(
                name:     'token',
                value:    '',
                minutes:  -1,
                path:     '/',
                domain:   config('session.domain'),
                secure:   true,
                httpOnly: true,
                sameSite: 'None',
            ));
    }
}
