<?php

namespace App\Services;

use App\Exceptions\IdpException;
use App\Models\SystemUser;
use App\Services\Sso\IdpClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Handles admin/superadmin account lifecycle.
 *
 * Keeps SystemUserController thin by owning all IdP + DB coordination.
 * All mutations are wrapped in DB transactions so a failed IdP call
 * never leaves the local DB in a partial state.
 */
class AdminUserService
{
    public function __construct(private IdpClient $idpClient) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Create an admin/superadmin in both the IdP and local DB.
     *
     * @throws IdpException|\Exception
     */
    public function create(array $validated): SystemUser
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

        return DB::transaction(function () use ($validated, $idpId) {
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
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Update an admin user's fields, syncing relevant changes to the IdP.
     *
     * @throws \Exception
     */
    public function update(SystemUser $user, array $validated): SystemUser
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

        return DB::transaction(function () use ($user, $validated) {
            $userFields = array_filter([
                'email'    => $validated['email']    ?? null,
                'password' => isset($validated['password']) ? Hash::make($validated['password']) : null,
                'role_id'  => $validated['role_id']  ?? null,
                'status'   => $validated['status']   ?? null,
            ], fn($v) => $v !== null);

            $profileFields = array_filter([
                'first_name'  => $validated['first_name']  ?? null,
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name'   => $validated['last_name']   ?? null,
                'suffix'      => $validated['suffix']      ?? null,
            ], fn($v) => $v !== null);

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
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Delete an admin user from the IdP and local DB.
     */
    public function delete(SystemUser $user): void
    {
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
