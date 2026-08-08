<?php

namespace App\Http\Controllers;

use App\Exceptions\AccountDeactivatedException;
use App\Exceptions\IdpException;
use App\Exceptions\UnregisteredAccountException;
use App\Http\Resources\UserResource;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;

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

            return response()
                ->json(['user' => new UserResource($user)])
                ->withCookie(Cookie::make(
                    name:     'token',
                    value:    $token,
                    minutes:  60 * 24 * 7,
                    path:     '/',
                    domain:   config('session.domain'),
                    secure:   config('session.secure'),
                    httpOnly: true,
                    sameSite: config('session.same_site'),
                ));
        } catch (IdpException $e) {
            $this->safeLog('warning', 'SSO: IdP error', ['message' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 401);
        } catch (UnregisteredAccountException $e) {
            $this->safeLog('warning', 'SSO: role error', ['message' => $e->getMessage()]);

            $logoutUrl = config('sso.base_url') . '/logout?' . http_build_query([
                'client_id'                => config('sso.client_id'),
                'post_logout_redirect_uri' => config('app.url'),
            ]);

            return response()->json([
                'message'    => $e->getMessage(),
                'logout_url' => $logoutUrl,
            ], 403);
        } catch (AccountDeactivatedException $e) {
            $this->safeLog('warning', 'SSO: deactivated account attempted login', ['message' => $e->getMessage()]);

            $logoutUrl = config('sso.base_url') . '/logout?' . http_build_query([
                'client_id'                => config('sso.client_id'),
                'post_logout_redirect_uri' => config('app.url'),
            ]);

            return response()->json([
                'message'    => $e->getMessage(),
                'logout_url' => $logoutUrl,
            ], 403);
        } catch (\Exception $e) {
            $this->safeLog('error', 'SSO: unexpected error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to process SSO login.'], 500);
        }
    }

    /**
     * Log without ever letting a logging failure escape.
     *
     * Log::warning()/error() write to storage/logs/laravel.log — if that
     * file isn't writable (e.g. it got recreated by a root-owned process
     * and php-fpm runs as www-data — see start.sh), the log call itself
     * throws. Because these calls live inside catch blocks, that new
     * exception is NOT caught by a sibling catch on the same try
     * statement, so it used to escape as an uncaught 500 in place of the
     * intended, more specific response (401/403). This wrapper guarantees
     * a bad logging backend degrades to "no log line" instead of hijacking
     * the response the caller already decided on.
     */
    private function safeLog(string $level, string $message, array $context = []): void
    {
        try {
            Log::{$level}($message, $context);
        } catch (\Throwable $loggingFailure) {
            // Intentionally swallowed — see docblock above.
        }
    }
}