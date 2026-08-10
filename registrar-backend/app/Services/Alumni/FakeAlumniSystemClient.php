<?php

namespace App\Services\Alumni;

use App\Contracts\AlumniSystemClientInterface;
use App\DTOs\Alumni\AlumniDTO;
use App\Models\Alumni;
use App\Models\SystemUser;

/**
 * Fake PUPTAPS client — reads from RIS's own alumni tables.
 *
 * Used when ALUMNI_MOCK=true. No HTTP call to PUPTAPS is made.
 * Reads Alumni → AlumniProfile → AlumniAcademicRecord and maps
 * them into the same AlumniDTO shape the real client returns,
 * so the controller and frontend are completely unaware of the swap.
 *
 * Fields not stored locally (email, number) are returned as null —
 * the frontend already handles nullable fields gracefully.
 */
class FakeAlumniSystemClient implements AlumniSystemClientInterface
{
    // ── AlumniSystemClientInterface ───────────────────────────────────────────

    public function tryListAlumni(array $filters = []): array
    {
        $query = Alumni::with('profile.academicRecord');

        // Search by name or student number
        if (!empty($filters['search'])) {
            $q = $filters['search'];
            $query->whereHas('profile', function ($q2) use ($q) {
                $q2->where('first_name', 'like', "%{$q}%")
                   ->orWhere('last_name',  'like', "%{$q}%");
            })->orWhereHas('profile.academicRecord', function ($q2) use ($q) {
                $q2->where('student_number', 'like', "%{$q}%");
            });
        }

        // Filter by batch (year of graduation)
        if (!empty($filters['batch'])) {
            $query->whereHas('profile.academicRecord', function ($q2) use ($filters) {
                $q2->where('year_of_graduation', $filters['batch']);
            });
        }

        // Filter by course
        if (!empty($filters['course_id'])) {
            $query->whereHas('profile.academicRecord', function ($q2) use ($filters) {
                $q2->where('course', 'like', "%{$filters['course_id']}%");
            });
        }

        // Pagination
        $perPage     = 20;
        $currentPage = max(1, (int) ($filters['page'] ?? 1));
        $paginated   = $query->paginate($perPage, ['*'], 'page', $currentPage);

        $dtos = array_values(array_filter(
            array_map(fn(Alumni $a) => $this->toDto($a), $paginated->items()),
        ));

        return [
            'data'         => $dtos,
            'total'        => $paginated->total(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'per_page'     => $perPage,
        ];
    }

    public function tryGetAlumni(string $id): ?AlumniDTO
    {
        // Match by alumni_id or student_number
        $alumni = Alumni::with('profile.academicRecord')
            ->where('alumni_id', $id)
            ->orWhereHas('profile.academicRecord', function ($q) use ($id) {
                $q->where('student_number', $id);
            })
            ->first();

        if (!$alumni) {
            return null;
        }

        return $this->toDto($alumni);
    }

    /**
     * Match by SystemUser.email, since RIS's local alumni tables don't
     * store email at all (see class docblock — the real client's DTO
     * fills email: null locally, PUPTAPS owns that field).
     *
     * IMPORTANT LIMITATION: this can only find an alumnus who ALREADY
     * has a SystemUser + Alumni row in RIS (e.g. testing re-login /
     * re-provisioning of an existing alumni account). It CANNOT simulate
     * a brand-new alumnus logging into RIS for the first time — that
     * scenario, by definition, involves someone RIS has never seen who
     * only exists in PUPTAPS, and there is no local email index to check
     * against. To test that specific flow (first-time alumni
     * auto-registration at login), set ALUMNI_MOCK=false and run
     * against a real or locally-running PUPTAPS instance instead.
     */
    public function tryLookupAlumniByEmail(string $email): ?AlumniDTO
    {
        $user = SystemUser::where('email', $email)->first();

        if (!$user) {
            return null;
        }

        $alumni = Alumni::with('profile.academicRecord')
            ->where('user_id', $user->user_id)
            ->first();

        return $alumni ? $this->toDto($alumni) : null;
    }

    // ── Private mapper ────────────────────────────────────────────────────────

    /**
     * Map an Alumni + profile + academicRecord into an AlumniDTO.
     * Returns null if the alumni has no profile yet (incomplete record).
     */
    private function toDto(Alumni $alumni): ?AlumniDTO
    {
        $profile = $alumni->profile;
        $record  = $profile?->academicRecord;

        if (!$profile) {
            return null;
        }

        return new AlumniDTO(
            alumniId:      $alumni->alumni_id,
            studNumber:    $record?->student_number  ?? '',
            lastName:      $profile->last_name,
            firstName:     $profile->first_name,
            middleName:    $profile->middle_name,
            suffix:        $profile->suffix,
            courseId:      $record?->course          ?? '',
            courseDesc:    $record?->course          ?? null,
            batch:         (int) ($record?->year_of_graduation ?? 0),
            yearGraduated: $record?->year_of_graduation        ?? '',
            sex:           $profile->sex_at_birth,
            birthday:      $profile->date_of_birth,
            email:         null,   // not stored in RIS — PUPTAPS owns this
            number:        null,   // not stored in RIS — PUPTAPS owns this
            profileStatus: 'Verified',
        );
    }
}