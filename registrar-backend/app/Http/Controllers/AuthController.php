<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Exceptions\IdpUnavailableException;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\SwitchRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Services\AuditLogger;
use App\Services\LocalAuthService;
use App\Services\RoleAssignmentService;
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
 *
 * login()'s validation now lives in App\Http\Requests\Auth\LoginRequest,
 * shared with LocalAuthController::login() since both had identical rules.
 */
class AuthController extends Controller
{
    public function __construct(
        private SsoAuthService  $ssoAuthService,
        private LocalAuthService $localAuth,
        private AuditLogger     $auditLogger,
        private RoleAssignmentService $roleAssignmentService,
    ) {}

    // -------------------------------------------------------------------------
    // POST /api/login
    // -------------------------------------------------------------------------
    public function login(LoginRequest $request)
    {
        $email    = $request->input('email');
        $password = $request->input('password');

        // ── Step 1: try the IDP ──────────────────────────────────────────────
        try {
            $result = $this->ssoAuthService->loginWithCredentials($email, $password, $request);

            $user  = $result['user'];
            // Re-issue with a name that encodes the auth method so
            // logout() can skip the IdP call for local sessions.
            $user->tokens()->delete();
            $token = $user->createToken('sanctum-idp')->plainTextToken;

            $user->loadIdentityRelations();

            // Mirrors the audit call in the local-fallback branch below.
            // Previously only local-auth logins were recorded, leaving the
            // majority (IDP) login path with no audit trail — a compliance
            // gap since AuditLog is the system of record for "who logged
            // in, when, from where."
            $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGIN);

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
        // Stamp 'sanctum-local' so logout() knows to skip the IdP redirect.
        $token = $user->createToken('sanctum-local')->plainTextToken;

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
    // POST /api/auth/switch-role
    //
    // Step 3 of Multi-Role Assignments: lets the caller assume any role
    // they currently hold an Active role_assignments row for (e.g. a
    // student-staff account flipping from Student to their restricted
    // Admin grant). All the validation/reissue logic lives in
    // RoleAssignmentService::switchTo() — this method's only job is the
    // HTTP plumbing: pull role_id off the request, reissue the cookie
    // the same way login() does, and return the user as they now appear
    // under the assumed role.
    // -------------------------------------------------------------------------
    public function switchRole(SwitchRoleRequest $request)
    {
        $user = $request->user();

        $result = $this->roleAssignmentService->switchTo(
            $user,
            (int) $request->validated('role_id'),
            $request
        );

        // switchTo() deleted the token this request authenticated with
        // and issued a brand new one carrying the assumed role. Rebind
        // this request's user instance to that new token so every
        // assumed-role helper (isAdmin(), effectivePermissions(), ...)
        // reflects the switch immediately in this response, rather than
        // the now-deleted token the request originally came in on.
        $user->withAccessToken($result['token_model']);
        $user->loadIdentityRelations();

        return response()
            ->json(['user' => new UserResource($user)])
            ->cookie(
                'token',
                $result['token'],
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
    // POST /api/logout
    // -------------------------------------------------------------------------
    public function logout(Request $request)
    {
        // Determine whether this session was established via the IdP or local
        // auth by reading the Sanctum token name stamped at login time.
        // 'sanctum-local' → local auth (explicit or IDP-fallback).
        // 'sanctum-idp'   → full IDP login.
        // Any other value is treated as IDP to stay safe.
        $tokenName  = $request->user()->currentAccessToken()?->name ?? 'sanctum-idp';
        $authMethod = str_starts_with($tokenName, 'sanctum-local') ? 'local' : 'idp';

        $logoutUrl = $this->ssoAuthService->logout($request->user(), $request, $authMethod);

        return response()
            ->json(['logout_url' => $logoutUrl])   // null for local-auth sessions
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