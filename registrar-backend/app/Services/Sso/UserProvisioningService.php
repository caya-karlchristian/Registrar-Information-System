<?php

namespace App\Services\Sso;

use App\Exceptions\OgosException;
use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\Ogos\OgosStudentService;

class UserProvisioningService
{
    public function __construct(
        private RoleResolver       $roleResolver,
        private OgosStudentService $ogosStudentService,
    ) {}

    public function provision(array $profile): ProvisioningResult
    {
        $email      = $profile['email'];
        $firstName  = $profile['first_name']  ?? null;
        $middleName = $profile['middle_name']  ?? null;
        $lastName   = $profile['last_name']    ?? null;

        return DB::transaction(function () use ($email, $firstName, $middleName, $lastName, $profile) {
            $existing = SystemUser::where('email', $email)->first();
            $roleId   = $this->roleResolver->resolve($existing);

            if (!$roleId) {
                // Not pre-registered — check OGOS before rejecting.
                // If they exist in OGOS they're a valid student; auto-register them.
                try {
                    $this->ogosStudentService->getClient()->getStudentByEmail($email);
                    $roleId = SystemUser::ROLE_STUDENT;
                } catch (OgosException) {
                    throw new \RuntimeException('Your account is not yet registered in RIS. Please contact the registrar.');
                }
            }

            $user = $existing ?? SystemUser::create([
                'email'       => $email,
                'idp_user_id' => $profile['id'] ?? null,
                'password'    => bcrypt(Str::random(32)),
                'role_id'     => $roleId,
                'status'      => 'Activated',
            ]);

            $needsOnboarding = $this->provisionProfile(
                $user, $roleId, $firstName, $middleName, $lastName
            );

            return new ProvisioningResult($user, $needsOnboarding);
        });
    }

    private function provisionProfile(
        SystemUser $user,
        int $roleId,
        ?string $firstName,
        ?string $middleName,
        ?string $lastName
    ): bool {
        if ($roleId === SystemUser::ROLE_STUDENT) {
            return $this->provisionStudentProfile($user, $firstName, $middleName, $lastName);
        }

        if ($roleId === SystemUser::ROLE_ALUMNI) {
            return $this->provisionAlumniProfile($user, $firstName, $middleName, $lastName);
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
