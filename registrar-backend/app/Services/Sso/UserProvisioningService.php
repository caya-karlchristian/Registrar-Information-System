<?php

namespace App\Services\Sso;

use App\Exceptions\AccountDeactivatedException;
use App\Exceptions\OgosException;
use App\Exceptions\UnregisteredAccountException;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\AuditLog;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use App\Services\AuditLogger;
use App\Services\Ocms\OcmsAdminService;
use App\Services\Ogos\OgosStudentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserProvisioningService
{
    public function __construct(
        private RoleResolver       $roleResolver,
        private OgosStudentService $ogosStudentService,
        private OcmsAdminService   $ocmsAdminService,
        private AuditLogger        $auditLogger,
    ) {}

    /**
     * @param Request $request  Needed only to attribute the
     *                          ACTION_ADMIN_ACTIVATED audit entry (browser +
     *                          IP of the activating login) when this call
     *                          happens to activate a Pending Activation
     *                          admin/super-admin record. Every other
     *                          provisioning path ignores it.
     */
    public function provision(array $profile, Request $request): ProvisioningResult
    {
        $email      = $profile['email'];
        $firstName  = $profile['first_name']  ?? null;
        $middleName = $profile['middle_name']  ?? null;
        $lastName   = $profile['last_name']    ?? null;

        return DB::transaction(function () use ($email, $firstName, $middleName, $lastName, $profile, $request) {
            $existing = SystemUser::where('email', $email)->first();

            // RIS is the source of truth for who can use RIS. A Deactivated
            // record is rejected here regardless of what the IdP currently
            // believes about the account (it may still show as "active"
            // there — IdP sync is best-effort, see AdminUserService::update())
            // and regardless of OCMS state. This runs before role
            // resolution so a deactivated admin can't slip back in through
            // any branch below, including a fresh SSO login that would
            // otherwise just issue a brand-new token.
            if ($existing && $existing->status === 'Deactivated') {
                throw new AccountDeactivatedException(
                    'This RIS account has been deactivated. Please contact the registrar.'
                );
            }

            $roleId = $this->roleResolver->resolve($existing);

            if (!$roleId) {
                // Not pre-registered in RIS at all.
                //
                // Deny-by-default: RIS never trusts the IdP's account type
                // alone to grant admin access. If the IdP says this login
                // is a "System Administrator" account, that ONLY means the
                // person has an IdP identity of that type — it says nothing
                // about whether RIS has agreed to let them in. Reject
                // immediately, without falling through to the OGOS
                // auto-registration branch below (which exists for
                // students, not admins, and could otherwise let a
                // System-Administrator-typed IdP account slip in as a
                // student if they happen to also have an OGOS record).
                if ($this->isSystemAdministratorAccountType($profile)) {
                    throw new UnregisteredAccountException(
                        'Your account is not yet registered in RIS. Please contact the registrar.'
                    );
                }

                // Not a System Administrator IdP account type — check OGOS
                // before rejecting. If they exist in OGOS they're a valid
                // student; auto-register them.
                try {
                    $this->ogosStudentService->getClient()->getStudentByEmail($email);
                    $roleId = SystemUser::ROLE_STUDENT;
                } catch (OgosException) {
                    throw new UnregisteredAccountException('Your account is not yet registered in RIS. Please contact the registrar.');
                }
            }

            $user = $existing ?? SystemUser::create([
                'email'       => $email,
                'idp_user_id' => $profile['id'] ?? null,
                'password'    => bcrypt(Str::random(32)),
                'role_id'     => $roleId,
                'status'      => 'Activated',
            ]);

            // Pre-registered admin/super-admin, first successful SSO login:
            // link the RIS record to the real IdP identity and flip it live.
            // DB is always the source of truth for *who* this is (role,
            // policy) — this only ever transitions Pending -> Activated and
            // backfills idp_user_id, it never re-derives role from the IdP.
            if ($existing
                && $existing->status === 'Pending Activation'
                && in_array($roleId, [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN], true)
            ) {
                $user->idp_user_id        = $profile['id'] ?? $user->idp_user_id;
                $user->status             = 'Activated';
                $user->pending_expires_at = null;
                $user->save();

                // The actor is the person themselves — this is an automatic
                // side effect of their own successful first login, not an
                // action performed on them by someone else. Matches the
                // ACTION_LOGIN entry SsoAuthService writes right after with
                // the same actor.
                $this->auditLogger->log($request, $user, AuditLog::ACTION_ADMIN_ACTIVATED, [
                    'target_user_id' => $user->user_id,
                    'target_email'   => $user->email,
                    'role_id'        => $user->role_id,
                ]);
            }

            $needsOnboarding = $this->provisionProfile(
                $user, $roleId, $firstName, $middleName, $lastName
            );

            return new ProvisioningResult($user, $needsOnboarding);
        });
    }

    /**
     * Whether the IdP profile identifies this login as an admin-tier
     * account type.
     *
     * CONFIRMED against real GET /api/v1/me responses (captured via
     * DevTools against the actual IdP, not inferred — see
     * IdpClient::fetchUserProfile):
     *   - Admin-tier accounts return a `roles` key as a plain string,
     *     e.g. "roles": "Admin". (Despite the plural key name, it is a
     *     single string, not an array, in every response seen so far.)
     *   - Non-admin accounts (students, etc.) omit the `roles` key
     *     entirely rather than sending an empty/null value.
     *
     * Not yet confirmed: whether the IdP ever distinguishes RIS admin
     * from RIS super-admin at this layer, or only ever sends "Admin"
     * for both tiers (the one super-admin sample captured so far only
     * returned "Admin", not "Super Admin" or similar). That distinction
     * doesn't matter for this method — it only needs to catch
     * "admin-tier, so don't auto-register as a student" — but matters
     * if this profile data is ever used to assign RIS role tiers
     * directly instead of just gating auto-registration.
     *
     * `roles` is normalized defensively (array → joined string) in case
     * a future account type returns multiple roles.
     */
    private function isSystemAdministratorAccountType(array $profile): bool
    {
        $roles = $profile['roles'] ?? null;

        if (is_array($roles)) {
            $roles = implode(',', $roles);
        }

        if (!is_string($roles) || $roles === '') {
            return false;
        }

        return str_contains(strtolower($roles), 'admin');
    }

    private function provisionProfile(
        SystemUser $user,
        int        $roleId,
        ?string    $firstName,
        ?string    $middleName,
        ?string    $lastName
    ): bool {
        if ($roleId === SystemUser::ROLE_STUDENT) {
            return $this->provisionStudentProfile($user, $firstName, $middleName, $lastName);
        }

        if ($roleId === SystemUser::ROLE_ALUMNI) {
            return $this->provisionAlumniProfile($user, $firstName, $middleName, $lastName);
        }

        if (in_array($roleId, [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN])) {
            return $this->ocmsAdminService->provisionAdminProfile($user);
        }

        return false;
    }

    private function provisionStudentProfile(SystemUser $user, ?string $firstName, ?string $middleName, ?string $lastName): bool
    {
        $isNew = !StudentProfile::where('user_id', $user->user_id)->exists();

        // Always try OGOS first — it is the source of truth and has
        // all required NOT NULL fields (date_of_birth, sex_at_birth).
        $provisioned = $this->ogosStudentService->provisionStudentData($user);

        if (!$provisioned && $isNew) {
            // OGOS was unreachable — insert a minimal stub so login
            // still succeeds. The stub will be overwritten on next login
            // when OGOS is back online.
            StudentProfile::create([
                'user_id'       => $user->user_id,
                'first_name'    => $firstName  ?? 'Unknown',
                'middle_name'   => $middleName,
                'last_name'     => $lastName   ?? 'Unknown',
                'date_of_birth' => '2000-01-01',
                'sex_at_birth'  => 'Male',
            ]);
        }

        return $isNew;
    }

    private function provisionAlumniProfile(SystemUser $user, ?string $firstName, ?string $middleName, ?string $lastName): bool
    {
        if (Alumni::where('user_id', $user->user_id)->exists()) {
            return false;
        }

        $alumni = Alumni::create([
            'user_id'        => $user->user_id,
            'alumni_type_id' => Alumni::TYPE_NON_SIS,
        ]);

        AlumniProfile::create([
            'alumni_id'   => $alumni->alumni_id,
            'first_name'  => $firstName,
            'middle_name' => $middleName,
            'last_name'   => $lastName,
        ]);

        return true;
    }
}