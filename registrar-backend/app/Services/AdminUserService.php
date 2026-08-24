<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use App\Services\Ocms\OcmsAdminService;
use App\Services\RoleAssignmentService;
use App\Services\Sso\IdpClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Handles admin/superadmin account lifecycle.
 *
 * ── Account creation model (post IdP-shortcut-deprecation) ────────────────
 * RIS no longer creates identities in the IdP. create() only pre-registers
 * who is allowed to have RIS access — email, role, policy — as a
 * 'Pending Activation' record. The actual IdP identity is created
 * separately, by hand, in the IdP's User Pool by the RIS system
 * administrator. The two are linked automatically on the person's first
 * SSO login (see Sso\UserProvisioningService::provision()), which backs
 * fill idp_user_id and flips the record to 'Activated'.
 *
 * No password is ever set here — RIS accounts authenticate exclusively
 * through the IdP. The only exception is the small, separately-managed
 * break-glass (local bcrypt) fallback, which is opt-in per Super Admin
 * account via the dedicated POST /api/auth/local-password endpoint
 * (LocalAuthController::setPassword -> LocalAuthService::setPassword) —
 * never through this method.
 *
 * update() and delete() are unaffected by this change: they operate on
 * an admin who (by definition) already has a linked, Activated IdP
 * identity, so they keep talking to the IdP directly via the
 * authenticated getSuperAdminToken() path.
 *
 * Work Item #2 — Admin Management Consolidation: update() deliberately
 * never reads/writes role_id, even if a direct API call includes it in
 * $validated (UpdateSystemUserRequest no longer declares a rule for it,
 * so it's stripped before reaching here — this is defense-in-depth on
 * top of that, not the only guard). A user's role is exclusively managed
 * through role_assignments now (RoleAssignmentService::grant()/revoke()),
 * which — unlike a plain column update — enforces the Student/Alumni <->
 * Admin/Super-Admin direction constraint. Letting this method silently
 * accept role_id would reopen exactly the bypass that constraint exists
 * to close.
 *
 * OCMS sync: profile changes are pushed to the OCMS hub AFTER a
 * successful local update. An OCMS failure logs a warning but does
 * NOT rollback the local change.
 */
class AdminUserService
{
    public function __construct(
        private IdpClient            $idpClient,
        private AuditLogger          $auditLogger,
        private OcmsAdminService     $ocmsAdminService,
        private RoleAssignmentService $roleAssignmentService,
    ) {}

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Pre-register a new admin/super-admin in RIS.
     *
     * This never talks to the IdP. It writes a 'Pending Activation' record
     * that has no credential of its own:
     *   - idp_user_id is null (backfilled on first SSO login)
     *   - password is null (users.password was made nullable specifically
     *     for this — see the add_pending_activation_status migration).
     *     Safe even though LocalAuthService::attempt() is reachable for
     *     any email: it checks local_auth_enabled (0 here) before ever
     *     looking at password, and separately guards `!$user->password`
     *     before calling Hash::check(), so a null password can never be
     *     authenticated against.
     *   - local_auth_enabled stays at its schema default (0)
     *   - pending_expires_at is set 14 days out; a Pending Activation
     *     record nobody activates by then is auto-expired by the
     *     provisioning:expire-stale scheduled command (see
     *     Console\Commands\ExpireStaleProvisioning)
     *
     * @throws \Throwable
     */
    public function create(array $validated, Request $request): SystemUser
    {
        $user = DB::transaction(function () use ($validated) {
            $user = SystemUser::create([
                'email'              => $validated['email'],
                // No credential at all yet — see docblock above.
                'password'           => null,
                'role_id'            => $validated['role_id'],
                'status'             => 'Pending Activation',
                'idp_user_id'        => null,
                'local_auth_enabled' => 0,
                'pending_expires_at' => now()->addDays(14),
                // Only admins (role_id = 3) carry a policy — super admins
                // always have unrestricted access, so silently ignore a
                // policy_id sent for a super-admin create.
                'policy_id'          => $validated['role_id'] === SystemUser::ROLE_ADMIN
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

        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_CREATED, [
            'target_user_id' => $user->user_id,
            'target_email'   => $user->email,
            'role_id'        => $user->role_id,
            'status'         => $user->status,
        ]);

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
            // Expected for an admin who is still 'Pending Activation' (has
            // never logged in via SSO yet) — nothing to sync to the IdP.
            // Only worth a warning once the account is otherwise supposed
            // to be usable.
            if ($user->status !== 'Pending Activation') {
                Log::warning('AdminUserService: update called on Activated user with no idp_user_id', [
                    'user_id' => $user->user_id,
                    'email'   => $user->email,
                ]);
            }
        }

        // RIS is the source of truth for whether an admin can use RIS.
        // The local status/role/profile change below always happens first
        // and always succeeds on its own — an unreachable or misbehaving
        // IdP must never prevent someone from being deactivated (or
        // reactivated) in RIS. IdP sync is attempted AFTER, best-effort,
        // and its failure is logged/audited but never rolled back or
        // thrown — mirrors the existing OcmsAdminService::pushProfileToOcms()
        // pattern used just below for profile pushes.
        $user = DB::transaction(function () use ($user, $validated) {
            // NOTE: role_id is intentionally never read from $validated
            // here — see the class docblock above.
            $userFields = array_filter([
                'email'    => $validated['email']    ?? null,
                'password' => isset($validated['password']) ? Hash::make($validated['password']) : null,
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
                $hasProfile = DB::table('admin_profile')
                    ->where('user_id', $user->user_id)
                    ->exists();

                if ($hasProfile) {
                    DB::table('admin_profile')
                        ->where('user_id', $user->user_id)
                        ->update($profileFields);
                } else {
                    // No admin_profile row yet for this account (e.g. one
                    // created outside AdminUserService::create(), which is
                    // the only other place that inserts one) — a plain
                    // ->update() above would silently match zero rows and
                    // this edit would be lost. first_name/last_name are
                    // NOT NULL, so default them when the caller didn't
                    // supply one, rather than letting the insert fail.
                    DB::table('admin_profile')->insert(array_merge([
                        'user_id'    => $user->user_id,
                        'first_name' => '',
                        'last_name'  => '',
                    ], $profileFields));
                }
            }

            return $user->fresh();
        });

        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_UPDATED, [
            'target_user_id' => $user->user_id,
            'target_email'   => $user->email,
        ]);

        // Immediately kill every active session the moment RIS-side status
        // stops being 'Activated' — do not wait for the IdP sync below (it
        // may fail or be slow) and do not rely solely on
        // EnsureAccountActive re-checking status on the person's NEXT
        // request. This is what actually logs them out right now: their
        // existing cookie token(s) stop being valid tokens at all, the
        // instant this commits, regardless of what the IdP or OCMS still
        // believe about the account.
        //
        // Cascades to Layer 2 as well: every Active role_assignments row
        // this account holds gets revoked in the same breath (see
        // RoleAssignmentService::revokeAllForUser()). Without this, a
        // deactivated student-staff account keeps showing "Active" on
        // both its Student and Admin rows forever, and reactivating the
        // account later would silently resurrect that Admin access with
        // no new deliberate grant behind it.
        if (isset($validated['status']) && $validated['status'] !== 'Activated') {
            $user->tokens()->delete();
            $this->roleAssignmentService->revokeAllForUser($user, $request);
        }

        // Best-effort IdP sync — runs OUTSIDE the DB transaction, after the
        // local change has already committed, and can never undo it. Only
        // attempted when there's something to sync (status/password) and
        // the account actually has a linked IdP identity. A failure here
        // (IdP down, endpoint rejected, network error) is logged and
        // audited so it can be reconciled manually, but the RIS-side
        // activation/deactivation has already taken effect either way.
        if ($user->idp_user_id && (isset($validated['status']) || isset($validated['password']))) {
            try {
                $adminToken = $this->idpClient->getSuperAdminToken();

                if (isset($validated['status'])) {
                    $idpStatus = $validated['status'] === 'Activated' ? 'active' : 'disabled';
                    $this->idpClient->updateUserStatus($user->idp_user_id, $idpStatus, $adminToken);
                }

                if (isset($validated['password'])) {
                    $this->idpClient->updateUserPassword($user->idp_user_id, $validated['password'], $adminToken);
                }
            } catch (\Throwable $e) {
                Log::warning('AdminUserService: IdP sync failed after local update — RIS-side change was NOT rolled back', [
                    'user_id'        => $user->user_id,
                    'email'          => $user->email,
                    'attempted'      => array_values(array_filter([
                        isset($validated['status'])   ? 'status'   : null,
                        isset($validated['password']) ? 'password' : null,
                    ])),
                    'error'          => $e->getMessage(),
                ]);

                $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_IDP_SYNC_FAILED, [
                    'target_user_id' => $user->user_id,
                    'target_email'   => $user->email,
                    'attempted'      => array_values(array_filter([
                        isset($validated['status'])   ? 'status'   : null,
                        isset($validated['password']) ? 'password' : null,
                    ])),
                    'error'          => $e->getMessage(),
                ]);
            }
        }

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
        $this->auditLogger->log($request, $request->user(), AuditLog::ACTION_ADMIN_DELETED, [
            'target_user_id' => $user->user_id,
            'target_email'   => $user->email,
        ]);

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