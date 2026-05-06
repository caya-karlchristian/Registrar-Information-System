<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Http\Resources\UserResource;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;

/**
 * Authentication controller.
 *
 * Handles login (credential-based), logout, and /me.
 * All SSO orchestration — including IdP token revocation and
 * audit logging — is delegated to SsoAuthService.
 */
class AuthController extends Controller
{
    public function __construct(private SsoAuthService $ssoAuthService) {}

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

$user  = $result['user'];
$token = $result['token'];

return response()
    ->json(['user' => new UserResource($user)])
    ->cookie(
        name:     'token',
        value:    $token,
        minutes:  60 * 24 * 7,
        path:     '/',
        domain:   env('SESSION_DOMAIN'),
        secure:   true,
        httpOnly: true,
        sameSite: 'Lax',
    );

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
        $logoutUrl = $this->ssoAuthService->logout($request->user(), $request);

        // Use Cookie::make() with the same attributes that were used when
        // setting the token (domain, secure, httpOnly, sameSite).
        // Cookie::forget() does not carry these — modern browsers will silently
        // refuse to clear a cookie whose clearing Set-Cookie doesn't match the
        // original attributes.
        return response()
            ->json(['logout_url' => $logoutUrl])
            ->withCookie(\Illuminate\Support\Facades\Cookie::make(
                name:     'token',
                value:    '',
                minutes:  -1,
                path:     '/',
                domain:   env('SESSION_DOMAIN'),
                secure:   true,
                httpOnly: true,
                sameSite: 'Lax',
            ));
    }
}
