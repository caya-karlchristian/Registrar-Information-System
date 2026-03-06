<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\SystemUser;
use Illuminate\Http\Request;

class AuditLogger
{
    // -------------------------------------------------------
    // Log an action for a given user.
    //
    // Usage anywhere in a controller:
    //   AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);
    //
    // The Request is needed to extract browser + IP address.
    // -------------------------------------------------------
    public static function log(
        Request $request,
        SystemUser $user,
        string $action
    ): void {
        AuditLog::create([
            'user_id'    => $user->user_id,
            'email'      => $user->email,
            'role_name'  => self::resolveRoleName($user->role_id),
            'action'     => $action,
            'browser'    => self::parseBrowser($request->userAgent()),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);
    }

    // -------------------------------------------------------
    // Resolve role_id to a human-readable name.
    // Mirrors UserResource::resolveRoleName() intentionally —
    // audit logs should use the same labels the UI shows.
    // -------------------------------------------------------
    private static function resolveRoleName(int $roleId): string
    {
        return match ($roleId) {
            SystemUser::ROLE_STUDENT     => 'student',
            SystemUser::ROLE_ALUMNI      => 'alumni',
            SystemUser::ROLE_ADMIN       => 'admin',
            SystemUser::ROLE_SUPER_ADMIN => 'super_admin',
            default                      => 'unknown',
        };
    }

    // -------------------------------------------------------
    // Parse a readable browser name from the User-Agent string.
    // Returns e.g. "Chrome", "Safari", "Firefox", "Edge",
    // "Mobile Safari", or the raw agent if unrecognized.
    // -------------------------------------------------------
    private static function parseBrowser(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        return match (true) {
            str_contains($userAgent, 'Edg')     => 'Edge',
            str_contains($userAgent, 'OPR')     => 'Opera',
            str_contains($userAgent, 'Chrome')  => 'Chrome',
            str_contains($userAgent, 'Firefox') => 'Firefox',
            str_contains($userAgent, 'Safari') &&
            str_contains($userAgent, 'Mobile')  => 'Mobile Safari',
            str_contains($userAgent, 'Safari')  => 'Safari',
            default                             => substr($userAgent, 0, 100),
        };
    }
}