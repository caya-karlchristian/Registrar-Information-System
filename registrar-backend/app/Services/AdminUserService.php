<?php

namespace App\Services;

use App\Exceptions\IdpException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use App\Services\Ocms\OcmsAdminService;
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
 * OCMS sync: profile changes are pushed to the OCMS hub AFTER a
 * successful local update. An OCMS failure logs a warning but does
 * NOT rollback the local change.
 *
 * Bug fixed: array_filter() previously used the default callback
 * which drops all falsy values (0, '', false). Changed to an
 * explicit !== null check so legitimate falsy values are kept.
 */
class AdminUserService
{
    public function __construct(
        private IdpClient        $idpClient,
        private AuditLogger      $auditLogger,
        private OcmsAdminService $ocmsAdminService,
    ) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * @throws IdpException|\Exception
     */
    public function create(array $validated, Request $request): SystemUser
    {
        // The IdP's own account-type enum (see its "New User" wizard) has
        // no concept of "admin" vs "superadmin" — it only knows a single
        // elevated type: "System Administrator". RIS's admin/superadmin
        // distinction is local-only (users.role_id + the policy system)
        // and is never sent to the IdP. Both RIS roles map to the same
        // IdP account type here.
        $idpRoleMap = [
            SystemUser::ROLE_ADMIN       => 'System Administrator',
            SystemUser::ROLE_SUPER_ADMIN => 'System Administrator',
        ];

        $adminToken = $this->idpClient->getSuperAdminToken();

        $idpId = $this->idpClient->createUser([
            'email'       => $validated['email'],
            'first_name'  => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? '',
            'last_name'   => $validated['last_name'],
            'password'    => $validated['password'],
            'role'        => $idpRoleMap[$validated['role_id']],
        ], $adminToken);

        try {
            $user = DB::transaction(function () use ($validated, $idpId) {
                $user = SystemUser::create([
                    'email'       => $validated['email'],
                    'password'    => Hash::make($validated['password']),
                    'role_id'     => $validated['role_id'],
                    'status'      => 'Activated',
                    'idp_user_id' => $idpId,
                    // Only admins (role_id = 3) carry a policy — super admins
                    // always have unrestricted access, so silently ignore a
                    // policy_id sent for a super-admin create.
                    'policy_id'   => $validated['role_id'] === SystemUser::ROLE_ADMIN
                        ? ($validated['policy_id'] ?? null)
                        : null,
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
        } catch (\Throwable $e) {
            // The IdP user was already created above. If the local DB write
            // fails (e.g. a race-condition unique constraint), we'd otherwise
            // be left with an orphaned IdP account that has no local record
            // and no way to be managed or deleted through this app. Roll it
            // back before rethrowing so IdP and local DB stay in sync.
            Log::error('AdminUserService: local DB insert failed after IdP user was created — rolling back orphaned IdP user', [
                'idp_user_id' => $idpId,
                'email'       => $validated['email'],
                'error'       => $e->getMessage(),
            ]);

            try {
                $this->idpClient->deleteUser($idpId, $adminToken);
            } catch (\Throwable $cleanupError) {
                // Cleanup failed too — this now genuinely needs manual
                // intervention in the IdP. Logged distinctly so it's easy
                // to grep for and doesn't get silently swallowed.
                Log::critical('AdminUserService: failed to roll back orphaned IdP user after local DB failure — manual cleanup required', [
                    'idp_user_id' => $idpId,
                    'email'       => $validated['email'],
                    'error'       => $cleanupError->getMessage(),
                ]);
            }

            throw $e;
        }

        $this->auditLogger->log($request, $user, AuditLog::ACTION_ADMIN_CREATED);

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
        if (!$user->idp_user_id) {
            // ⚠️ This admin has no IdP record — password changes will
            // desync and break login. This user needs to be re-created
            // through AdminUserService::create() or have their idp_user_id patched.
            Log::error('AdminUserService: update called on user with no idp_user_id', [
                'user_id' => $user->user_id,
                'email'   => $user->email,
            ]);
        }

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
                'office'      => $validated['office']      ?? null,
                'contact_no'  => $validated['contact_no']  ?? null,
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

        $this->auditLogger->log($request, $user, AuditLog::ACTION_ADMIN_UPDATED);

        // Push profile changes back to OCMS hub — runs OUTSIDE the DB transaction
        // so an OCMS failure cannot rollback a successful local update.
        $this->ocmsAdminService->pushProfileToOcms($user, $validated);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function delete(SystemUser $user, Request $request): void
    {
        // Audit BEFORE delete so we still have the actor context
        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_DELETED);

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