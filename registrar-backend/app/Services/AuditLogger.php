<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\SystemUser;
use Illuminate\Http\Request;

/**
 * Records user actions to the audit_log table.
 *
 * Registered as a singleton in AppServiceProvider so the same instance
 * is shared across the request lifecycle.  Being an instance class
 * (rather than static) means it can be swapped for a test double:
 *
 *   $this->instance(AuditLogger::class, Mockery::mock(AuditLogger::class));
 */
class AuditLogger
{
    // -------------------------------------------------------
    // Log an action for a given user.
    //
    // Usage — inject via constructor, then call:
    //   $this->auditLogger->log($request, $actor, AuditLog::ACTION_LOGIN);
    //
    // $user is always the ACTOR — the authenticated user who performed the
    // action, never the record being acted on. For actions performed ON
    // another user (e.g. an admin being created/updated/deleted), pass
    // that user's identity via $metadata using the 'target_user_id' /
    // 'target_email' keys — they're lifted into dedicated indexed columns
    // automatically so the target can be queried/joined on directly. Any
    // other keys are kept as-is in the metadata JSON column.
    //
    //   $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_CREATED, [
    //       'target_user_id' => $newAdmin->user_id,
    //       'target_email'   => $newAdmin->email,
    //   ]);
    //
    // The Request is needed to extract browser + IP address.
    // -------------------------------------------------------
    public function log(
        Request    $request,
        SystemUser $user,
        string     $action,
        array      $metadata = []
    ): void {
        $targetUserId = $metadata['target_user_id'] ?? null;
        $targetEmail  = $metadata['target_email'] ?? null;
        unset($metadata['target_user_id'], $metadata['target_email']);

        AuditLog::create([
            'user_id'         => $user->user_id,
            'email'           => $user->email,
            'role_name'       => $this->resolveRoleName($user->role_id),
            'target_user_id'  => $targetUserId,
            'target_email'    => $targetEmail,
            'action'          => $action,
            'browser'         => $this->parseBrowser($request->userAgent()),
            'ip_address'      => $request->ip(),
            'metadata'        => !empty($metadata) ? $metadata : null,
            'created_at'      => now(),
        ]);
    }

    // -------------------------------------------------------
    // Resolve role_id to a human-readable name.
    // Mirrors UserResource::resolveRoleName() intentionally —
    // audit logs should use the same labels the UI shows.
    // -------------------------------------------------------
    private function resolveRoleName(int $roleId): string
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
    // "Mobile Safari", or the raw agent if unrecognised.
    // -------------------------------------------------------
    private function parseBrowser(?string $userAgent): ?string
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