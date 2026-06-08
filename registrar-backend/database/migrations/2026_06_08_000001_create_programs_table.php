<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the `programs` table — a self-populating local mirror of OGOS courses.
 *
 * WHY A LOCAL TABLE INSTEAD OF CALLING OGOS DIRECTLY
 * ---------------------------------------------------
 * OGOS has no dedicated "list all programs" endpoint. However, every student
 * login already calls OgosStudentService::upsertLocalRecords(), which receives
 * the student's course { id, code, name } from the OGOS student payload.
 *
 * We hook into that moment: if the program is not yet in this table, we insert
 * it. The table fills itself organically as students log in — no OGOS API
 * changes, no manual seeding, no cron job required.
 *
 * COLUMNS
 * -------
 * ogos_course_id   — the integer PK from OGOS (course.id). Used as the
 *                    stable external identifier. NOT our own auto-increment PK
 *                    so we stay in sync with OGOS IDs stored in
 *                    student_academic_record.course_id.
 * code             — short code, e.g. "BSIT", "BSCS". Nullable because early
 *                    OGOS responses sometimes omit it.
 * name             — full human-readable name, e.g. "BS Information Technology".
 * is_active        — soft flag; lets staff hide defunct programs from dropdowns
 *                    without deleting history (student records still reference them).
 * timestamps       — created_at / updated_at for audit trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->unsignedInteger('ogos_course_id')->primary();
            $table->string('code', 20)->nullable();
            $table->string('name', 255);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programs');
    }
};
