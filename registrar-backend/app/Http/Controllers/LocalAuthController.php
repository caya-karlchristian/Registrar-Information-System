<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use App\Services\LocalAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * LocalAuthController
 * ===================
 * Handles the two new local-auth endpoints:
 *
 *   POST /api/auth/local-login
 *       Always authenticates against the local bcrypt hash.
 *       Used by staff when they know the IDP is down and don't want
 *       the IDP-first round-trip delay.
 *
 *   POST /api/auth/local-password      (superadmin only)
 *       Set or update the local password for any user.
 *       Body: { user_id: int, password: string, password_confirmation: string }
 *
 *   GET  /api/auth/local-auth-status   (superadmin only)
 *       Returns which users have local_auth_enabled = 1.
 *       Useful for the admin panel to show coverage at a glance.
 */
class LocalAuthController extends Controller
{
    public function __construct(
        private LocalAuthService $localAuth,
        private AuditLogger      $auditLogger,
    ) {}

    // -----------------------------------------------------------------------
    // POST /api/auth/local-login
    // -----------------------------------------------------------------------
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $user = $this->localAuth->attempt(
                $request->input('email'),
                $request->input('password'),
            );
        } catch (\RuntimeException $e) {
            $statusCode = $e->getCode() ?: 401;
            return response()->json(['message' => $e->getMessage()], $statusCode);
        }

        $user->loadIdentityRelations();
        $token = $user->createToken('sanctum')->plainTextToken;

        $this->auditLogger->log($request, $user, AuditLog::ACTION_LOGIN);

        Log::info('LocalAuth: login success', [
            'user_id' => $user->user_id,
            'email'   => $user->email,
        ]);

        return response()
            ->json(['user' => new UserResource($user)])
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

    // -----------------------------------------------------------------------
    // POST /api/auth/local-password  (superadmin only)
    // -----------------------------------------------------------------------
    public function setPassword(Request $request)
    {
        $validated = $request->validate([
            'user_id'               => 'required|integer|exists:users,user_id',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ]);

        /** @var SystemUser $target */
        $target = SystemUser::findOrFail($validated['user_id']);

        $this->localAuth->setPassword($target, $validated['password']);

        $this->auditLogger->log($request, $request->user(), 'local_password_set', [
            'target_user_id' => $target->user_id,
            'target_email'   => $target->email,
        ]);

        return response()->json([
            'message' => 'Local password set successfully.',
            'user_id' => $target->user_id,
            'email'   => $target->email,
        ]);
    }

    // -----------------------------------------------------------------------
    // GET /api/auth/local-auth-status  (superadmin only)
    // -----------------------------------------------------------------------
    public function status(Request $request)
    {
        $users = SystemUser::select('user_id', 'email', 'role_id', 'status', 'local_auth_enabled')
            ->orderBy('role_id')
            ->orderBy('email')
            ->get()
            ->map(fn ($u) => [
                'user_id'            => $u->user_id,
                'email'              => $u->email,
                'role_id'            => $u->role_id,
                'status'             => $u->status,
                'local_auth_enabled' => (bool) $u->local_auth_enabled,
            ]);

        return response()->json(['users' => $users]);
    }
}
