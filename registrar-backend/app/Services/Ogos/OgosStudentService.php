<?php

namespace App\Services\Ogos;

use App\DTOs\Ogos\OgosAddressDTO;
use App\DTOs\Ogos\OgosPersonalInfoDTO;
use App\DTOs\Ogos\OgosStudentDTO;
use App\Exceptions\OgosException;
use App\Models\Program;
use App\Models\StudentAcademicRecord;
use App\Models\StudentAddress;
use App\Models\StudentContactInformation;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Support\Facades\Log;

/**
 * Business logic layer for OGOS student data.
 *
 * provisionStudentData() is called on every SSO login — it upserts
 * student_profile and student_academic_record from OGOS.
 * All other methods are on-demand lookups for controllers.
 *
 * Change (2026-06-08): upsertLocalRecords() now also upserts the `programs`
 * table from the course object on the OGOS student payload. The programs table
 * self-populates as students log in — no OGOS endpoint needed, no manual seed.
 */
class OgosStudentService
{
    public function __construct(private readonly OgosClient $client) {}

    /** Expose the underlying client for auth-time checks (e.g. OGOS existence check). */
    public function getClient(): OgosClient
    {
        return $this->client;
    }

    // ── Provisioning ──────────────────────────────────────────

    /**
     * Fetch OGOS data and upsert local mirror rows.
     * Returns true if data was written, false if OGOS was unreachable.
     * Fails silently — a login must never break because OGOS is down.
     */
    public function provisionStudentData(SystemUser $user): bool
    {
        // Step 1: Get the flat student record by email
        try {
            $student = $this->client->getStudentByEmail($user->email);
        } catch (OgosException $e) {
            Log::warning('OGOS: student not found during provisioning', [
                'email'  => $user->email,
                'error'  => $e->getMessage(),
            ]);
            return false;
        }

        // Step 2: Get personal info (separate endpoint — dateOfBirth, gender, etc.)
        $personal = null;
        try {
            $personal = $this->client->getStudentPersonalInfo($student->studentNumber);
        } catch (OgosException $e) {
            Log::warning('OGOS: personal-info unavailable during provisioning', [
                'student_number' => $student->studentNumber,
                'error'          => $e->getMessage(),
            ]);
        }

        // Step 3: Get addresses (separate endpoint, may return multiple
        // types — Residential, Provincial). Best-effort like personal-info:
        // a login must never break because this call fails or OGOS has no
        // address on file for this student yet.
        $addresses = [];
        try {
            $addresses = $this->client->getStudentAddresses($student->studentNumber);
        } catch (OgosException $e) {
            Log::warning('OGOS: addresses unavailable during provisioning', [
                'student_number' => $student->studentNumber,
                'error'          => $e->getMessage(),
            ]);
        }

        $this->upsertLocalRecords($user, $student, $personal, $addresses);
        return true;
    }

    // ── On-demand lookups (used by controllers) ───────────────

    public function getEnrichedProfile(string $studentNumber): array
    {
        $student = $this->client->getStudentByNumber($studentNumber);
        $local   = StudentAcademicRecord::where('student_number', $studentNumber)
            ->with('studentProfile')
            ->first();

        return ['ogos' => $student->toArray(), 'local' => $local];
    }

    public function getPersonalInfo(string $studentNumber): OgosPersonalInfoDTO
    {
        return $this->client->getStudentPersonalInfo($studentNumber);
    }

    /** @return OgosAddressDTO[] */
    public function getAddresses(string $studentNumber): array
    {
        return $this->client->getStudentAddresses($studentNumber);
    }

    /** @return OgosStudentDTO[] */
    public function search(array $filters): array
    {
        return $this->client->listStudents($filters);
    }

    // ── Private helpers ───────────────────────────────────────

    private function upsertLocalRecords(
        SystemUser $user,
        OgosStudentDTO $student,
        ?OgosPersonalInfoDTO $personal,
        array $addresses = []
    ): void {
        // Map OGOS gender string → DB enum
        $sexAtBirth = match (strtolower($personal?->gender ?? '')) {
            'male'   => 'Male',
            'female' => 'Female',
            default  => 'Male',
        };

        $profile = StudentProfile::updateOrCreate(
            ['user_id' => $user->user_id],
            [
                'first_name'     => $student->firstName,
                'middle_name'    => $student->middleName,
                'last_name'      => $student->lastName,
                'date_of_birth'  => $personal?->dateOfBirth  ?? '2000-01-01',
                'place_of_birth' => $personal?->placeOfBirth ?? null,
                'sex_at_birth'   => $sexAtBirth,
            ]
        );

        // ── Upsert the local programs mirror FIRST ────────────────
        // Must happen before the student_academic_record upsert below: that
        // table's course_id has an FK to programs.ogos_course_id, so the
        // parent row has to exist before we write the child row that
        // references it — otherwise the very first login for a brand-new
        // course would fail the FK check.
        //
        // If this student's program hasn't been seen before, insert it.
        // If it has, update the code/name in case OGOS renamed it.
        // is_active is intentionally NOT touched here — staff can deactivate
        // defunct programs without them being re-activated on the next login
        // of a student who somehow still has that course_id.
        if ($student->courseId !== null) {
            Program::updateOrCreate(
                ['ogos_course_id' => $student->courseId],
                [
                    'code' => $student->courseCode,
                    'name' => $student->courseName,
                ]
            );
        }

        StudentAcademicRecord::updateOrCreate(
            ['student_profile_id' => $profile->student_profile_id],
            [
                'student_number' => $student->studentNumber,
                'year_level'     => $student->yearLevel,
                'section'        => $student->section,
                'course_id'      => $student->courseId,
                // Store the human-readable course name so the frontend can
                // display it directly without a course table join.
                // OGOS is the source of truth — this is updated on every login.
                'course'         => $student->courseName,
            ]
        );

        // ── Contact info: mobile/email, straight from the already-fetched
        // student DTO — no extra OGOS call needed for this part.
        StudentContactInformation::updateOrCreate(
            ['student_profile_id' => $profile->student_profile_id],
            [
                'mobile_number'           => $student->mobileNumber,
                'personal_email_address'  => $student->email,
            ]
        );

        // ── Addresses: one row per address type OGOS returns (Residential,
        // Provincial, etc.). Best-effort — $addresses is empty if the
        // earlier fetch failed or OGOS has nothing on file, in which case
        // this is just a no-op rather than clearing out existing rows.
        /** @var OgosAddressDTO $address */
        foreach ($addresses as $address) {
            StudentAddress::updateOrCreate(
                [
                    'student_profile_id' => $profile->student_profile_id,
                    'address_type'       => $address->addressType,
                ],
                [
                    'street_detail'  => $address->streetDetail,
                    'barangay_code'  => $address->barangayCode,
                    'barangay_name'  => $address->barangayName,
                    'city_code'      => $address->cityCode,
                    'city_name'      => $address->cityName,
                    'province_code'  => $address->provinceCode,
                    'province_name'  => $address->provinceName,
                    'region_code'    => $address->regionCode,
                    'region_name'    => $address->regionName,
                    'synced_at'      => now(),
                ]
            );
        }
    }
}