#!/usr/bin/env python3
"""
fix_course_year_level.py
========================
Fixes Course and Year Level showing as N/A everywhere in the UI.

Root cause
----------
The `student_academic_record` table has a `course_id` column (an integer
foreign key) but no `course` column storing the human-readable name.
OGOS returns the full course name in `OgosStudentDTO.courseName` but
`OgosStudentService::upsertLocalRecords()` only saves `course_id`.
The frontend reads `academic_record.course` which is always undefined → N/A.

Fix
---
1. Create a Laravel migration that adds a `course` VARCHAR(255) column to
   `student_academic_record` (nullable, placed after `course_id`).

2. Update `OgosStudentService::upsertLocalRecords()` to also save
   `course => $student->courseName` alongside `course_id`.

3. After deploy, run the migration then re-login (or trigger a manual
   re-provision) so existing rows get the course name populated.

Files modified
--------------
  registrar-backend/app/Services/Ogos/OgosStudentService.php
  registrar-backend/database/migrations/<timestamp>_add_course_to_student_academic_record.php  (new)

Usage
-----
  Drop in project root (Registrar-Information-System/) and run:
      python3 fix_course_year_level.py

  Then rebuild and migrate:
      docker compose up --build -d backend
      docker exec ris_backend php artisan migrate

  Existing students will get their course name populated on next login
  (OgosStudentService.provisionStudentData runs on every SSO login).
  To backfill immediately without waiting for re-logins, run:
      docker exec ris_backend php artisan tinker --execute="
        App\\Models\\SystemUser::where('role_id', 1)->each(function($u) {
          app(App\\Services\\Ogos\\OgosStudentService::class)->provisionStudentData($u);
        });
        echo 'Done.';
      "
"""

from __future__ import annotations

import shutil
import sys
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def backup(path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = path.with_suffix(f"{path.suffix}.bak_{ts}")
    shutil.copy2(path, dest)
    return dest


def write(path: Path, content: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Expected file not found: {path}")
    bak = backup(path)
    path.write_text(content, encoding="utf-8")
    print(f"  ✔  {path.relative_to(ROOT)}  (backup → {bak.name})")


def create(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  ✔  {path.relative_to(ROOT)}  (new file)")


def abort(msg: str) -> None:
    print(f"\n✖  {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Locate project root
# ---------------------------------------------------------------------------

ROOT    = Path(__file__).resolve().parent
BACKEND = ROOT / "registrar-backend"
OGOS_SERVICE = BACKEND / "app" / "Services" / "Ogos" / "OgosStudentService.php"
MIGRATIONS   = BACKEND / "database" / "migrations"

for required in [OGOS_SERVICE]:
    if not required.exists():
        abort(
            f"Cannot find {required.relative_to(ROOT)}.\n"
            "Make sure you run this script from the project root "
            "(Registrar-Information-System/)."
        )


# ---------------------------------------------------------------------------
# 1. Migration — add `course` column to student_academic_record
# ---------------------------------------------------------------------------

MIGRATION_TS   = datetime.now().strftime("%Y_%m_%d_%H%M%S")
MIGRATION_NAME = f"{MIGRATION_TS}_add_course_to_student_academic_record.php"

MIGRATION = """\
<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

/**
 * Adds a `course` column to student_academic_record.
 *
 * WHY
 * ---
 * OGOS returns the full course name (e.g. "BS Information Technology") in
 * OgosStudentDTO->courseName, but we were only storing course_id (an integer).
 * The frontend reads academic_record.course — a human-readable string — so
 * without this column Course always shows as N/A.
 *
 * The column is nullable so existing rows are unaffected.
 * OgosStudentService::upsertLocalRecords() now populates it on every login.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_academic_record', function (Blueprint $table) {
            // Placed after course_id for logical grouping.
            $table->string('course')->nullable()->after('course_id');
        });
    }

    public function down(): void
    {
        Schema::table('student_academic_record', function (Blueprint $table) {
            $table->dropColumn('course');
        });
    }
};
"""

# ---------------------------------------------------------------------------
# 2. OgosStudentService.php — save courseName in upsertLocalRecords
# ---------------------------------------------------------------------------

OGOS_SERVICE_CONTENT = """\
<?php

namespace App\\Services\\Ogos;

use App\\DTOs\\Ogos\\OgosAddressDTO;
use App\\DTOs\\Ogos\\OgosPersonalInfoDTO;
use App\\DTOs\\Ogos\\OgosStudentDTO;
use App\\Exceptions\\OgosException;
use App\\Models\\StudentAcademicRecord;
use App\\Models\\StudentProfile;
use App\\Models\\SystemUser;
use Illuminate\\Support\\Facades\\Log;

/**
 * Business logic layer for OGOS student data.
 *
 * provisionStudentData() is called on every SSO login — it upserts
 * student_profile and student_academic_record from OGOS.
 * All other methods are on-demand lookups for controllers.
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

        $this->upsertLocalRecords($user, $student, $personal);
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
        ?OgosPersonalInfoDTO $personal
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
    }
}
"""


# ---------------------------------------------------------------------------
# Apply changes
# ---------------------------------------------------------------------------

def main() -> None:
    print("\nCourse / Year Level fix — applying changes\n")

    # 1. Migration
    migration_path = MIGRATIONS / MIGRATION_NAME
    create(migration_path, MIGRATION)

    # 2. OgosStudentService
    write(OGOS_SERVICE, OGOS_SERVICE_CONTENT)

    print(
        "\nDone. Two files changed:\n"
        f"  • database/migrations/{MIGRATION_NAME}\n"
        "  • app/Services/Ogos/OgosStudentService.php\n"
        "\nNext steps:\n"
        "\n  1. Rebuild and run the migration:\n"
        "       docker compose up --build -d backend\n"
        "       docker exec ris_backend php artisan migrate\n"
        "\n  2. Backfill existing students (optional — they also get fixed on next login):\n"
        "       docker exec ris_backend php artisan tinker --execute=\"\\\n"
        "         App\\\\Models\\\\SystemUser::where('role_id', 1)->each(function(\\$u) {\\\n"
        "           app(App\\\\Services\\\\Ogos\\\\OgosStudentService::class)->provisionStudentData(\\$u);\\\n"
        "         });\\\n"
        "         echo 'Done.';\\\n"
        "       \"\n"
    )


if __name__ == "__main__":
    main()
