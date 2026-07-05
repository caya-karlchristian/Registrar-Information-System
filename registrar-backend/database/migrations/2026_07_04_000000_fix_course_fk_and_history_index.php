<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fixes the course_id / courses mismatch found by tracing OgosStudentService:
 *
 *   - student_academic_record.course_id is populated from OGOS's course.id
 *     (see OgosStudentService::upsertLocalRecords()), but the schema's FK
 *     (fk_sar_course) points it at the `courses` table — a table nothing in
 *     the app ever writes to, queries, or has a model for.
 *   - The table that actually mirrors OGOS courses is `programs`, keyed by
 *     ogos_course_id (see Program model + ProgramController docblock).
 *   - This migration repoints the FK at programs.ogos_course_id and drops
 *     the dead `courses` table. The corresponding code fix — reordering
 *     OgosStudentService::upsertLocalRecords() so the programs row is
 *     written before the student_academic_record row that references it —
 *     has already been applied in the same change (see OgosStudentService.php).
 *
 * Also adds the missing index on request_history.changed_at, used by
 * AnalyticsService::processingTime() and the AI query payload builder via
 * whereBetween('changed_at', ...) — every other FK/filter column on this
 * table is indexed, this one was missed.
 *
 * CORRECTION vs the original draft: SHOW CREATE TABLE confirmed
 * student_academic_record.course_id is NOT NULL on the live database (the
 * schema file this was drafted against had it nullable — drift between the
 * two). Preserved as NOT NULL here rather than loosening it.
 *
 * IDEMPOTENCY NOTE: written defensively like 2026_07_03_000000, given that
 * migration's partial-failure history on this same database. Every
 * structural change checks current state first via information_schema, so
 * this is safe to re-run from any partial state. Column MODIFY statements
 * don't need guards — MySQL accepts re-applying the same column definition.
 *
 * IMPORTANT — run before deploying to a database with real data:
 *   1. SELECT sar.course_id FROM student_academic_record sar
 *        LEFT JOIN programs p ON p.ogos_course_id = sar.course_id
 *        WHERE sar.course_id IS NOT NULL AND p.ogos_course_id IS NULL;
 *      Any rows returned reference a course_id that has no matching program
 *      row yet — the new FK will reject those until they're backfilled
 *      (e.g. by having that student log in again, which upserts the
 *      programs row, or by inserting the missing programs rows manually).
 *   2. The `courses` table is dropped outright. If anything outside this
 *      codebase (a report, an export job, another service) reads from it,
 *      confirm that first — nothing inside this Laravel app does.
 *
 * This migration targets MySQL and uses a raw MODIFY statement for the
 * course_id type change instead of Blueprint::change(), so it does not
 * require doctrine/dbal.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- student_academic_record: repoint the FK at programs ------------
        if ($this->constraintExists('student_academic_record', 'fk_sar_course')) {
            Schema::table('student_academic_record', function (Blueprint $table) {
                $table->dropForeign('fk_sar_course');
            });
        }

        // Match programs.ogos_course_id's type (unsigned int). NOT NULL
        // preserved to match the live column (see CORRECTION note above).
        // MODIFY is naturally idempotent, no existence guard needed.
        DB::statement('ALTER TABLE student_academic_record MODIFY course_id INT UNSIGNED NOT NULL');

        if (!$this->constraintExists('student_academic_record', 'fk_sar_program')) {
            Schema::table('student_academic_record', function (Blueprint $table) {
                $table->foreign('course_id', 'fk_sar_program')
                    ->references('ogos_course_id')->on('programs');
            });
        }

        // --- courses: drop, nothing in the app ever uses it ------------------
        Schema::dropIfExists('courses');

        // --- request_history: add the missing changed_at index (if missing) -
        if (!$this->indexExists('request_history', 'idx_rh_changed_at')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->index('changed_at', 'idx_rh_changed_at');
            });
        }
    }

    public function down(): void
    {
        if ($this->indexExists('request_history', 'idx_rh_changed_at')) {
            Schema::table('request_history', fn (Blueprint $table) => $table->dropIndex('idx_rh_changed_at'));
        }

        // Recreate `courses` so the FK below has something to point at again.
        if (!Schema::hasTable('courses')) {
            Schema::create('courses', function (Blueprint $table) {
                $table->integer('course_id')->autoIncrement();
                $table->string('code', 50)->unique();
                $table->string('course_name', 200)->unique();
            });
        }

        if ($this->constraintExists('student_academic_record', 'fk_sar_program')) {
            Schema::table('student_academic_record', fn (Blueprint $table) => $table->dropForeign('fk_sar_program'));
        }

        DB::statement('ALTER TABLE student_academic_record MODIFY course_id INT NOT NULL');

        if (!$this->constraintExists('student_academic_record', 'fk_sar_course')) {
            Schema::table('student_academic_record', function (Blueprint $table) {
                $table->foreign('course_id', 'fk_sar_course')
                    ->references('course_id')->on('courses');
            });
        }
    }

    /** True if the named index/key exists on the given table in the current database. */
    private function indexExists(string $table, string $index): bool
    {
        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    /** True if the named constraint (FK, unique, or CHECK) exists on the given table. */
    private function constraintExists(string $table, string $constraint): bool
    {
        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = DATABASE()')
            ->where('table_name', $table)
            ->where('constraint_name', $constraint)
            ->exists();
    }
};