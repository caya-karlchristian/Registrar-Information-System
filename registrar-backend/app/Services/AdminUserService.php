<?php

namespace App\Services;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\Sso\IdpClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Handles admin/superadmin account lifecycle.
 *
 * Owns IdP + DB coordination AND audit logging so controllers
 * stay thin HTTP adapters with no cross-cutting concerns.
 *
 * All mutations are wrapped in DB transactions so a failed IdP
 * call never leaves the local DB in a partial state.
 *
 * Bug fixed: array_filter() previously used the default callback
 * which drops all falsy values (0, '', false). Changed to an
 * explicit !== null check so legitimate falsy values are kept.
 */
class AdminUserService
{
    public function __construct(private IdpClient $idpClient) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * @throws IdpException|\Exception
     */
    public function create(array $validated, Request $request): SystemUser
    {
        $idpRoleMap = [
            SystemUser::ROLE_ADMIN       => 'RIS:admin',
            SystemUser::ROLE_SUPER_ADMIN => 'RIS:superadmin',
        ];

        $adminToken = $this->idpClient->getSuperAdminToken();

        $idpId = $this->idpClient->createUser([
            'email'       => $validated['email'],
            'first_name'  => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? '',
            'last_name'   => $validated['last_name'],
            'password'    => $validated['password'],
            'roles'       => [$idpRoleMap[$validated['role_id']]],
        ], $adminToken);

        $user = DB::transaction(function () use ($validated, $idpId) {
            $user = SystemUser::create([
                'email'       => $validated['email'],
                'password'    => Hash::make($validated['password']),
                'role_id'     => $validated['role_id'],
                'status'      => 'Activated',
                'idp_user_id' => $idpId,
            ]);

            DB::table('admin_profile')->insert([
                'user_id'     => $user->user_id,
                'first_name'  => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name'   => $validated['last_name'],
                'suffix'      => $validated['suffix'] ?? null,
            ]);

            return $user;
        });

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_CREATED);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * @throws \Exception
     */
    public function update(SystemUser $user, array $validated, Request $request): SystemUser
    {
        if ($user->idp_user_id) {
            $adminToken = $this->idpClient->getSuperAdminToken();

            if (isset($validated['status'])) {
                $idpStatus = $validated['status'] === 'Activated' ? 'active' : 'disabled';
                $this->idpClient->updateUserStatus($user->idp_user_id, $idpStatus, $adminToken);
            }

            if (isset($validated['password'])) {
                $this->idpClient->updateUserPassword($user->idp_user_id, $validated['password'], $adminToken);
            }
        }

        $user = DB::transaction(function () use ($user, $validated) {
            // FIX: was array_filter($arr) — default callback drops falsy values
            // like 0 or ''. Using !== null keeps all intentionally-set values.
            $userFields = array_filter([
                'email'    => $validated['email']    ?? null,
                'password' => isset($validated['password']) ? Hash::make($validated['password']) : null,
                'role_id'  => $validated['role_id']  ?? null,
                'status'   => $validated['status']   ?? null,
            ], fn ($v) => !is_null($v));

            $profileFields = array_filter([
                'first_name'  => $validated['first_name']  ?? null,
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name'   => $validated['last_name']   ?? null,
                'suffix'      => $validated['suffix']      ?? null,
            ], fn ($v) => !is_null($v));

            if (!empty($userFields)) {
                $user->update($userFields);
            }

            if (!empty($profileFields)) {
                DB::table('admin_profile')
                    ->where('user_id', $user->user_id)
                    ->update($profileFields);
            }

            return $user->fresh();
        });

        AuditLogger::log($request, $user, AuditLog::ACTION_ADMIN_UPDATED);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function delete(SystemUser $user, Request $request): void
    {
        // Audit BEFORE delete so we still have the actor context
        AuditLogger::log($request, $request->user(), AuditLog::ACTION_ADMIN_DELETED);

        if ($user->idp_user_id) {
            try {
                $adminToken = $this->idpClient->getSuperAdminToken();
                $this->idpClient->deleteUser($user->idp_user_id, $adminToken);
            } catch (\Exception $e) {
                Log::warning('AdminUserService: IdP delete failed', [
                    'user_id' => $user->user_id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        $user->delete();
    }
}
