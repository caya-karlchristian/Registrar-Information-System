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

$user->loadIdentityRelations();

// --- DEBUG START ---
    $cookieName = 'token';
    $cookieMinutes = 60 * 24 * 7;
    
    // We create the cookie object manually to measure it
    $debugCookie = Cookie::make(
        name:     $cookieName,
        value:    $token,
        minutes:  $cookieMinutes,
        path:     '/',
        domain:   env('SESSION_DOMAIN'),
        secure:   true,
        httpOnly: true,
        sameSite: 'Lax',
    );

    // Log the length. If this is > 4000, it will likely be dropped by the browser.
    Log::info('SSO Cookie Debug', [
        'user_id' => $user->id,
        'length'  => strlen($debugCookie->getValue()),
        'domain'  => env('SESSION_DOMAIN')
    ]);
    // --- DEBUG END ---

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
        'client_id'                => config('sso.client_id'),
        'post_logout_redirect_uri' => config('app.url'),
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