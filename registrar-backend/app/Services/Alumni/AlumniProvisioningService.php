<?php

namespace App\Services\Alumni;

use App\Contracts\AlumniSystemClientInterface;
use App\DTOs\Alumni\AlumniDTO;
use App\Models\Alumni;
use App\Models\AlumniAcademicRecord;
use App\Models\AlumniProfile;
use App\Models\SystemUser;
use Illuminate\Support\Facades\Log;

/**
 * Business logic layer for PUPTAPS alumni data — the alumni-side
 * counterpart to OgosStudentService.
 *
 * provisionAlumniData() is called on every SSO login for a ROLE_ALUMNI
 * user — it upserts alumni/alumni_profile/alumni_academic_record from
 * PUPTAPS, the same "always try the source of truth first" pattern
 * OgosStudentService uses for students.
 *
 * IMPORTANT DIFFERENCE from the student flow: PUPTAPS's /alumni/lookup
 * endpoint (the only one RIS's login-time token is scoped to call)
 * deliberately does NOT return date_of_birth or sex — those live behind
 * the 'alumni:sensitive' ability, which is intentionally not granted for
 * a basic existence check (see PHASE2_OAUTH2_CLIENT_CREDENTIALS.md and
 * the PUPTAPS-side AlumniController::lookup() docblock). So unlike
 * students, a freshly-provisioned alumni_profile row will always have
 * placeholder date_of_birth/sex_at_birth values, not real ones, until a
 * future on-demand call to the sensitive-tier endpoints (e.g. from a
 * profile-completion screen) fills them in. needsOnboarding=true on
 * first provisioning is what should drive that follow-up screen.
 */
class AlumniProvisioningService
{
    public function __construct(private readonly AlumniSystemClientInterface $client) {}

    /** Expose the underlying client for auth-time checks (e.g. PUPTAPS existence check). */
    public function getClient(): AlumniSystemClientInterface
    {
        return $this->client;
    }

    // ── Provisioning ──────────────────────────────────────────

    /**
     * Fetch PUPTAPS data and upsert local mirror rows.
     *
     * @param AlumniDTO|null $prefetched  Pass this in if the caller already
     *      fetched the DTO (e.g. UserProvisioningService's auto-registration
     *      existence check) to avoid a redundant second HTTP call to
     *      PUPTAPS for the same email on the same login.
     * @return bool  True if an alumni_profile row exists after this call
     *      (whether just-written or already present) — mirrors
     *      provisionStudentData()'s "did we get real data" semantics,
     *      NOT "was this newly created." Callers needing isNew (for
     *      needsOnboarding) should check existence before calling this.
     */
    public function provisionAlumniData(
        SystemUser $user,
        ?string $firstName = null,
        ?string $middleName = null,
        ?string $lastName = null,
        ?AlumniDTO $prefetched = null,
    ): bool {
        $dto = $prefetched ?? $this->client->tryLookupAlumniByEmail($user->email);

        $alumni = Alumni::firstOrCreate(
            ['user_id' => $user->user_id],
            ['alumni_type_id' => Alumni::TYPE_NON_SIS] // overwritten below if PUPTAPS confirms them
        );

        if ($dto === null) {
            Log::warning('Alumni System unavailable — leaving existing profile as-is', [
                'user_id' => $user->user_id,
                'email'   => $user->email,
            ]);

            // First-ever login with PUPTAPS unreachable: write a minimal
            // stub so login still succeeds, same graceful-degradation
            // contract as provisionStudentProfile()'s OGOS-down fallback.
            // The stub gets overwritten with real data on a later login
            // once PUPTAPS is reachable.
            if (!AlumniProfile::where('alumni_id', $alumni->alumni_id)->exists()) {
                AlumniProfile::create([
                    'alumni_id'      => $alumni->alumni_id,
                    'first_name'     => $firstName  ?? 'Unknown',
                    'middle_name'    => $middleName,
                    'last_name'      => $lastName   ?? 'Unknown',
                    'date_of_birth'  => '2000-01-01', // placeholder — see class docblock
                    'sex_at_birth'   => 'Male',        // placeholder — see class docblock
                ]);

                return true;
            }

            // Profile already exists from a previous successful login —
            // nothing to do, leave it untouched.
            return true;
        }

        // PUPTAPS confirmed this person — mark as SIS-verified regardless
        // of whether the row already existed as a NON_SIS stub.
        $alumni->update(['alumni_type_id' => Alumni::TYPE_SIS]);

        $existingProfile = AlumniProfile::where('alumni_id', $alumni->alumni_id)->first();
        $existingRecord  = $existingProfile
            ? AlumniAcademicRecord::where('alumni_profile_id', $existingProfile->alumni_profile_id)->first()
            : null;

        $profile = AlumniProfile::updateOrCreate(
            ['alumni_id' => $alumni->alumni_id],
            [
                'first_name'     => $dto->firstName,
                'middle_name'    => $dto->middleName,
                'last_name'      => $dto->lastName,
                'suffix'         => $dto->suffix,
                // Not returned by /alumni/lookup (alumni:sensitive not
                // granted at login time) — placeholders until a
                // profile-completion flow captures the real values.
                // Only set on first creation; an existing real value
                // (from a future sensitive-tier call) is never clobbered
                // back to the placeholder on a later login.
                'date_of_birth'  => $existingProfile->date_of_birth ?? '2000-01-01',
                'sex_at_birth'   => $existingProfile->sex_at_birth  ?? 'Male',
            ]
        );

        AlumniAcademicRecord::updateOrCreate(
            ['alumni_profile_id' => $profile->alumni_profile_id],
            [
                'student_number'     => $dto->studNumber,
                // 'year_of_graduation' is a MySQL YEAR column — it needs the
                // numeric batch year, not $dto->yearGraduated (PUPTAPS
                // returns that as a full graduation date, e.g. 2020-05-07,
                // which MySQL truncates and, under strict mode, rejects
                // outright).
                'year_of_graduation' => $this->resolveYearOfGraduation(
                    $dto->batch,
                    $existingRecord?->year_of_graduation,
                    $user,
                ),
                'course'             => $dto->courseDesc ?? $dto->courseId,
            ]
        );

        return true;
    }

    /**
     * Validate PUPTAPS's `batch` before it hits a MySQL YEAR column.
     *
     * `year_of_graduation` is NOT NULL, so a bad upstream value can't just
     * be dropped — it has to resolve to *something* valid every time this
     * runs (every SSO login), or the insert throws again. Precedence:
     *   1. $incomingYear if it's a real, in-range YEAR value (1901–2155).
     *   2. The previously stored value, so one bad response from PUPTAPS
     *      never regresses a row that already had good data.
     *   3. The current year, as a last-resort placeholder — only reachable
     *      on a row's very first provisioning with already-bad upstream
     *      data, i.e. there's nothing valid to fall back to yet.
     * Cases 2 and 3 are logged so a bad upstream field doesn't fail silently.
     */
    private function resolveYearOfGraduation(int $incomingYear, ?int $existingYear, SystemUser $user): int
    {
        $isValidYear = static fn (?int $year): bool => $year !== null && $year >= 1901 && $year <= 2155;

        if ($isValidYear($incomingYear)) {
            return $incomingYear;
        }

        Log::warning('Alumni System returned an invalid batch/graduation year — not writing it as-is', [
            'user_id'       => $user->user_id,
            'incoming_year' => $incomingYear,
        ]);

        if ($isValidYear($existingYear)) {
            return $existingYear;
        }

        return (int) date('Y');
    }
}