<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
