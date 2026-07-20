<?php

namespace Database\Seeders;

use App\Models\SystemUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * LOCAL DEVELOPMENT ONLY — do not run against staging or production.
 *
 * Creates exactly 4 fixed test accounts, one per role, with local-auth
 * enabled so they can log in via password rather than SSO. This is the
 * full local dev account set on purpose — no bulk/random fake users.
 *
 * Passwords here are provided directly (not the Laravel factory default)
 * because these accounts are meant to be memorable, fixed test logins.
 * They are hashed via Hash::make() before being stored — never stored
 * or logged in plaintext.
 *
 * Usage: wired into DatabaseSeeder::run() behind an
 * app()->environment('local') guard — never runs outside local.
 */
class LocalDevSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment('local')) {
            $this->command->error('LocalDevSeeder refused to run outside APP_ENV=local.');
            return;
        }

        $this->command->info('Seeding fixed local dev accounts...');

        $this->seedSuperAdmin();
        $this->seedAdmin();
        $this->seedStudent();
        $this->seedAlumni();

        $this->command->info('Done. Local test accounts:');
        $this->command->line('  teamtech4ward.ris2027@gmail.com  (super_admin)');
        $this->command->line('  mhelgarcia@gmail.com             (admin — Registrar Staff)');
        $this->command->line('  juan@gmail.com                   (student)');
        $this->command->line('  maria@gmail.com                  (alumni)');
    }

    private function seedSuperAdmin(): void
    {
        $user = SystemUser::updateOrCreate(
            ['email' => 'teamtech4ward.ris2027@gmail.com'],
            [
                'password'            => Hash::make('Tech4ward@2027'),
                'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
                'status'              => 'Activated',
                'local_auth_enabled'  => 1,
            ]
        );

        DB::table('admin_profile')->updateOrInsert(
            ['user_id' => $user->user_id],
            [
                'first_name' => 'Team',
                'last_name'  => 'Tech4ward',
                'office'     => 'System Administration',
            ]
        );
    }

    private function seedAdmin(): void
    {
        $user = SystemUser::updateOrCreate(
            ['email' => 'mhelgarcia@gmail.com'],
            [
                'password'            => Hash::make('SE^e!41xz6Od'),
                'role_id'             => SystemUser::ROLE_ADMIN,
                'status'              => 'Activated',
                'local_auth_enabled'  => 1,
                // policy_id=1 = "Registrar Staff", seeded in
                // DatabaseSeeder::seedPolicies() with real permissions
                // (inbox/logbook/profile/analytics/dashboard access).
                'policy_id'           => 1,
            ]
        );

        DB::table('admin_profile')->updateOrInsert(
            ['user_id' => $user->user_id],
            [
                'first_name' => 'Mhel',
                'last_name'  => 'Garcia',
                'office'     => 'Registrar Staff',
            ]
        );
    }

    private function seedStudent(): void
    {
        $user = SystemUser::updateOrCreate(
            ['email' => 'juan@gmail.com'],
            [
                'password'            => Hash::make('Jo*B!7TRyQ3B'),
                'role_id'             => SystemUser::ROLE_STUDENT,
                'status'              => 'Activated',
                'local_auth_enabled'  => 1,
            ]
        );

        $profileId = DB::table('student_profile')->updateOrInsert(
            ['user_id' => $user->user_id],
            [
                'first_name'    => 'Juan',
                'last_name'     => 'Dela Cruz',
                'date_of_birth' => '2003-01-15',
                'sex_at_birth'  => 'Male',
            ]
        );

        $studentProfileId = DB::table('student_profile')
            ->where('user_id', $user->user_id)
            ->value('student_profile_id');

        DB::table('student_academic_record')->updateOrInsert(
            ['student_profile_id' => $studentProfileId],
            [
                'student_number' => '2022-00001-TG',
                // course_id references programs (seeded in
                // DatabaseSeeder::seedPrograms()) — 6 = BSIT.
                'course_id'      => 6,
                'course'         => 'Bachelor of Science in Information Technology',
                'year_level'     => 3,
                'school_year_admitted' => '2022-2023',
            ]
        );
    }

    private function seedAlumni(): void
    {
        $user = SystemUser::updateOrCreate(
            ['email' => 'maria@gmail.com'],
            [
                'password'            => Hash::make('!&jn&EuM6hdi'),
                'role_id'             => SystemUser::ROLE_ALUMNI,
                'status'              => 'Activated',
                'local_auth_enabled'  => 1,
            ]
        );

        // alumni_type is seeded elsewhere in DatabaseSeeder — grab
        // whatever the first available type is rather than hardcoding
        // an ID we haven't independently confirmed.
        $alumniTypeId = DB::table('alumni_type')->value('alumni_type_id');

        DB::table('alumni')->updateOrInsert(
            ['user_id' => $user->user_id],
            ['alumni_type_id' => $alumniTypeId]
        );

        $alumniId = DB::table('alumni')->where('user_id', $user->user_id)->value('alumni_id');

        DB::table('alumni_profile')->updateOrInsert(
            ['alumni_id' => $alumniId],
            [
                'first_name'    => 'Maria',
                'last_name'     => 'Santos',
                'date_of_birth' => '1998-05-20',
                'sex_at_birth'  => 'Female',
            ]
        );

        $alumniProfileId = DB::table('alumni_profile')->where('alumni_id', $alumniId)->value('alumni_profile_id');

        DB::table('alumni_academic_record')->updateOrInsert(
            ['alumni_profile_id' => $alumniProfileId],
            [
                'student_number'    => '2018-04567-TG',
                'year_of_graduation' => 2022,
                'course'            => 'BSIT',
            ]
        );
    }
}