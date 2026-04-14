<?php

namespace App\Http\Controllers;

use App\Exceptions\IdpException;
use App\Services\Sso\SsoAuthService;
use Illuminate\Http\Request;
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
            return response()->json($result);
        } catch (IdpException $e) {
            Log::warning('SSO: IdP error', ['message' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 401);
        } catch (\RuntimeException $e) {
            Log::warning('SSO: role error', ['message' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            Log::error('SSO: unexpected error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to process SSO login.'], 500);
        }
    }
}