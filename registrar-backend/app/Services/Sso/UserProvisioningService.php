<?php

namespace App\Services\Sso;

use App\Models\Alumni;
use App\Models\AlumniProfile;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserProvisioningService
{
    public function __construct(private RoleResolver $roleResolver) {}

    public function provision(array $profile, array $idpRoles): ProvisioningResult
    {
        $email      = $profile['email'];
        $firstName  = $profile['first_name']  ?? null;
        $middleName = $profile['middle_name']  ?? null;
        $lastName   = $profile['last_name']    ?? null;

        return DB::transaction(function () use ($email, $firstName, $middleName, $lastName, $idpRoles) {
            $existing = SystemUser::where('email', $email)->first();
            $roleId   = $this->roleResolver->resolve($idpRoles, $existing);

            if (!$roleId) {
                throw new \RuntimeException('No recognized role for this user.');
            }

            $user = $existing ?? SystemUser::create([
                'email'    => $email,
                'idp_user_id' => $profile['id'] ?? null,  // add this
                'password' => bcrypt(Str::random(32)),
                'role_id'  => $roleId,
                'status'   => 'Activated',
            ]);

            if ($existing && $this->roleResolver->shouldUpdateRole($existing, $roleId)) {
                $user->update(['role_id' => $roleId]);
            }

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
        if (StudentProfile::where('user_id', $user->user_id)->exists()) {
            return false;
        }

        StudentProfile::create([
            'user_id'     => $user->user_id,
            'first_name'  => $firstName,
            'middle_name' => $middleName,
            'last_name'   => $lastName,
        ]);

        return true;
    }

    private function provisionAlumniProfile(SystemUser $user, ?string $firstName, ?string $middleName, ?string $lastName): bool
    {
        if (Alumni::where('user_id', $user->user_id)->exists()) {
            return false;
        }

        $alumni = Alumni::create([
            'user_id'        => $user->user_id,
            'alumni_type_id' => Alumni::TYPE_NON_SIS, // default; corrected during onboarding
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