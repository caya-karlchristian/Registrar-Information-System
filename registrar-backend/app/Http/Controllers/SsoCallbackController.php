<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cookie;

class SsoCallbackController extends Controller
{
    public function __construct(private SsoAuthService $ssoAuthService) {}

    public function handle(Request $request)
    {
        $code = $request->input('code');

        if (!$code) {
            return response()->json(['message' => 'Authorization code is required.'], 422);
        }

        try {
$result = $this->ssoAuthService->loginWithCode($code, $request);
$token  = $result['token'];
$user   = $result['user'];

return response()
    ->json(['user' => new \App\Http\Resources\UserResource($user)])
    ->withCookie(Cookie::make(
        name:     'token',
        value:    $token,
        minutes:  60 * 24 * 7,
        path:     '/',
        domain:   env('SESSION_DOMAIN'),
        secure:   true,
        httpOnly: true,
        sameSite: 'Lax',
    ));
        } catch (IdpException $e) {
            Log::warning('SSO: IdP error', ['message' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 401);
        } catch (\RuntimeException $e) {
    Log::warning('SSO: role error', ['message' => $e->getMessage()]);

    $logoutUrl = config('sso.base_url') . '/logout?' . http_build_query([
        'client_id' => config('sso.client_id'),
    ]);

    return response()->json([
        'message'    => $e->getMessage(),
        'logout_url' => $logoutUrl,  
    ], 403);
} catch (\Exception $e) {
            Log::error('SSO: unexpected error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to process SSO login.'], 500);
        }
    }
}