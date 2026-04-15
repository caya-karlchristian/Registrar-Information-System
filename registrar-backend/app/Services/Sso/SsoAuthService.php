<?php

namespace App\Services\Sso;

use App\Exceptions\IdpException;
use App\Services\AuditLogger;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SsoAuthService
{
    public function __construct(
        private IdpClient $idpClient,
        private UserProvisioningService $provisioner,
    ) {}

    public function loginWithCode(string $code, Request $request): array
{

    $accessToken = $this->idpClient->exchangeCode($code);
    $profile     = $this->idpClient->fetchUserProfile($accessToken);

    $result = $this->provisioner->provision($profile);
    $user   = $result->user;


    // Single update — removed the duplicate above
    $user->update([
        'idp_access_token' => $accessToken,
        'idp_user_id'      => $profile['id'] ?? $profile['user_id'] ?? $profile['sub'] ?? null,
    ]);


    AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

    $token = $user->createToken('sso')->plainTextToken;

    return [
        'token'            => $token,
        'needs_onboarding' => $result->needsOnboarding,
        'data'             => [
            'user_id'   => $user->user_id,
            'email'     => $user->email,
            'role_id'   => $user->role_id,
            'role_name' => $user->role_name ?? null,
        ],
    ];
}
}
