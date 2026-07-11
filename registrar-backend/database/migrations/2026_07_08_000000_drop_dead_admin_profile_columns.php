<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drops date_of_birth, place_of_birth, and sex_at_birth from admin_profile.
 *
 * These duplicate birthday/gender (the columns actually synced from OCMS —
 * see OcmsAdminProfileDTO / OcmsAdminService / AdminUserService) but aren't
 * in AdminProfile::$fillable and aren't read or written anywhere in the app
 * for an admin. They're leftovers from the student_profile/alumni_profile
 * migration, where date_of_birth/sex_at_birth ARE the real, actively-used
 * columns (synced from OGOS) — copy-pasted onto admin_profile without a
 * corresponding code path.
 *
 * Confirmed dead via full-codebase search before writing this migration —
 * not present in AdminProfile::$fillable, no DTO, no controller, no
 * frontend reference.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as the other migrations
 * in this batch (2026_07_03 through 2026_07_06) — safe to re-run from any
 * partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_profile', function (Blueprint $table) {
            foreach (['date_of_birth', 'place_of_birth', 'sex_at_birth'] as $column) {
                if (Schema::hasColumn('admin_profile', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        // Restored empty — these columns were confirmed unused, so there's
        // no data to bring back, only the structure.
        Schema::table('admin_profile', function (Blueprint $table) {
            if (!Schema::hasColumn('admin_profile', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('civil_status');
            }
            if (!Schema::hasColumn('admin_profile', 'place_of_birth')) {
                $table->string('place_of_birth', 150)->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('admin_profile', 'sex_at_birth')) {
                $table->enum('sex_at_birth', ['Male', 'Female'])->nullable()->after('place_of_birth');
            }
        });
    }
};
