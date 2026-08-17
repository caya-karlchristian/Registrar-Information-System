<?php

namespace App\Services\Sso;

use App\DTOs\Alumni\AlumniDTO;
use App\Exceptions\AccountDeactivatedException;
use App\Exceptions\OgosException;
use App\Exceptions\UnregisteredAccountException;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\AuditLog;
use App\Models\RoleAssignment;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use App\Services\Alumni\AlumniProvisioningService;
use App\Services\AuditLogger;
use App\Services\Ocms\OcmsAdminService;
use App\Services\Ogos\OgosStudentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserProvisioningService
{
    public function __construct(
        private RoleResolver             $roleResolver,
        private OgosStudentService       $ogosStudentService,
        private AlumniProvisioningService $alumniProvisioningService,
        private OcmsAdminService         $ocmsAdminService,
        private AuditLogger              $auditLogger,
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
        $idpUserId  = $profile['id'] ?? null;
        $firstName  = $profile['first_name']  ?? null;
        $middleName = $profile['middle_name']  ?? null;
        $lastName   = $profile['last_name']    ?? null;

        return DB::transaction(function () use ($email, $idpUserId, $firstName, $middleName, $lastName, $profile, $request) {
            // Match by IdP UUID first. This is the durable identity link —
            // it survives the user changing their PUP webmail address at
            // the IdP, which email-only matching does not (see incident:
            // an email change would previously look like a brand-new user,
            // orphaning all history under the old email's row).
            //
            // Email is only used as a fallback, for accounts that don't
            // have an idp_user_id yet — e.g. a Pending Activation admin's
            // very first login (AdminUserService::create() sets
            // idp_user_id = null on invite), or a not-yet-registered
            // person's first-ever login below. Every account that has
            // ever successfully logged in already has idp_user_id set —
            // see ensureBaselineRoleAssignment()'s sibling guarantee, the
            // Pending Activation -> Activated transition further down,
            // and the SystemUser::create() call below, all of which write
            // idp_user_id in the same step that sets status = 'Activated'.
            $existing = $idpUserId
                ? SystemUser::where('idp_user_id', $idpUserId)->first()
                : null;

            if (!$existing) {
                $existing = SystemUser::where('email', $email)->first();
            }

            // Matched by UUID but the email on file is stale — the user
            // changed their PUP webmail at the IdP. Sync it here, before
            // anything else below reads $existing->email, so the record
            // stays queryable/matchable by the new email too (e.g. by
            // OGOS/PUPTAPS lookups elsewhere, which key on email).
            //
            // Guarded against the `email` unique constraint: if some other
            // row already holds the new email (a pre-existing data
            // conflict this fix doesn't attempt to resolve automatically),
            // skip the sync and log loudly rather than let a raw
            // QueryException take down the login.
            if ($existing && $idpUserId && $existing->idp_user_id === $idpUserId && $existing->email !== $email) {
                $emailTaken = SystemUser::where('email', $email)
                    ->where('user_id', '!=', $existing->user_id)
                    ->exists();

                if ($emailTaken) {
                    Log::error('SSO: cannot sync changed email — new email already belongs to a different user_id', [
                        'user_id'   => $existing->user_id,
                        'old_email' => $existing->email,
                        'new_email' => $email,
                    ]);
                } else {
                    Log::info('SSO: email changed at IdP, syncing local record', [
                        'user_id'   => $existing->user_id,
                        'old_email' => $existing->email,
                        'new_email' => $email,
                    ]);
                    $existing->email = $email;
                    $existing->save();
                }
            }

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

            // Captured only if the not-pre-registered branch below ends up
            // confirming this person against PUPTAPS — reused by
            // provisionAlumniProfile() further down so a single login
            // never calls PUPTAPS twice for the same email.
            $prefetchedAlumniDto = null;

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
                    // Not a current OGOS student either — check PUPTAPS
                    // before rejecting. If they exist there they're a valid
                    // alumnus; auto-register them the same way. Keep the
                    // DTO so provisionAlumniProfile() doesn't have to fetch
                    // it again a few lines down.
                    $prefetchedAlumniDto = $this->alumniProvisioningService->getClient()->tryLookupAlumniByEmail($email);

                    if ($prefetchedAlumniDto !== null) {
                        $roleId = SystemUser::ROLE_ALUMNI;
                    } else {
                        throw new UnregisteredAccountException('Your account is not yet registered in RIS. Please contact the registrar.');
                    }
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
                $user, $roleId, $firstName, $middleName, $lastName, $prefetchedAlumniDto
            );

            $this->ensureBaselineRoleAssignment($user, $roleId);

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

    /**
     * Guarantees every SystemUser has at least one role_assignments row
     * for the role they actually hold, before they ever reach
     * RoleAssignmentService::grant().
     *
     * Why this exists here specifically: 2026_08_10_000001_backfill_role_
     * assignments_from_users.php gave every user that existed AT THAT
     * TIME a baseline Active row, but this provision() path — which runs
     * on every SSO login, including the very first one for a brand-new
     * SystemUser::create() below and for a pre-registered Pending
     * Activation admin's first login — never inserted one going forward.
     * A Super Admin could then grant() a second role onto an account
     * that only ever had zero rows, leaving exactly one row (the
     * granted one) instead of two, which silently hides the role
     * switcher (Navigation.jsx gates on roleAssignments.length > 1) and
     * leaves switchTo() unable to switch back to the original role.
     *
     * This runs unconditionally (existing users included) rather than
     * only in the `$existing === null` branch, so it also covers a
     * pre-registered admin/super-admin activating for the first time
     * (created via AdminUserService::create(), which — like this method
     * used to — writes a SystemUser row with no matching role_assignments
     * row). It's a cheap existence check and is idempotent: any account
     * that already has at least one row (from the backfill, an earlier
     * login, or a grant()) is left untouched.
     *
     * granted_by is deliberately null and expires_at is deliberately
     * null (indefinite) — same reasoning as the backfill migration: this
     * is a system-derived baseline, not a human decision to time-box,
     * and there's no grantor to attribute it to.
     *
     * See also RoleAssignmentService::grant(), which independently
     * backfills this same baseline row as defense-in-depth for accounts
     * that reached grant() before this fix shipped.
     */
    private function ensureBaselineRoleAssignment(SystemUser $user, int $roleId): void
    {
        $hasAnyAssignment = RoleAssignment::where('user_id', $user->user_id)->exists();

        if ($hasAnyAssignment) {
            return;
        }

        RoleAssignment::create([
            'user_id'    => $user->user_id,
            'role_id'    => $roleId,
            'policy_id'  => in_array($roleId, [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN], true)
                ? $user->policy_id
                : null,
            'status'     => RoleAssignment::STATUS_ACTIVE,
            'granted_by' => null,
            'granted_at' => now(),
            'expires_at' => null,
        ]);
    }

    private function provisionProfile(
        SystemUser  $user,
        int         $roleId,
        ?string     $firstName,
        ?string     $middleName,
        ?string     $lastName,
        ?AlumniDTO  $prefetchedAlumniDto = null,
    ): bool {
        if ($roleId === SystemUser::ROLE_STUDENT) {
            return $this->provisionStudentProfile($user, $firstName, $middleName, $lastName);
        }

        if ($roleId === SystemUser::ROLE_ALUMNI) {
            return $this->provisionAlumniProfile($user, $firstName, $middleName, $lastName, $prefetchedAlumniDto);
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

    private function provisionAlumniProfile(
        SystemUser $user,
        ?string    $firstName,
        ?string    $middleName,
        ?string    $lastName,
        ?AlumniDTO $prefetchedAlumniDto = null,
    ): bool {
        $existingAlumni = Alumni::where('user_id', $user->user_id)->first();
        $isNew = !$existingAlumni || !AlumniProfile::where('alumni_id', $existingAlumni->alumni_id)->exists();

        // Always try PUPTAPS — it is the source of truth, same reasoning
        // as provisionStudentProfile()'s "always try OGOS first". Reuses
        // $prefetchedAlumniDto when the caller already fetched it during
        // the not-pre-registered auto-registration check, so a brand-new
        // alumnus's first login only ever costs one PUPTAPS call, not two.
        // All actual read/write logic — including the NOT NULL
        // date_of_birth/sex_at_birth placeholder handling — lives in
        // AlumniProvisioningService; see its class docblock for why those
        // two fields can't be populated with real data at login time.
        $this->alumniProvisioningService->provisionAlumniData(
            $user, $firstName, $middleName, $lastName, $prefetchedAlumniDto
        );

        return $isNew;
    }
}