<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supports RoleAssignmentService::searchGrantableUsers() — the typeahead
 * lookup behind the "Grant a Role" picker (see
 * RoleAssignmentController::searchUsers()). That query filters
 * student_profile/admin_profile/alumni_profile by first_name/last_name
 * PREFIX (LIKE 'term%'), which only stays fast as these tables grow into
 * the thousands if the leading edge of the search is indexed — a
 * LIKE 'term%' scan can use a standard B-tree index (unlike '%term%',
 * which cannot use one at all and forces a full table scan).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profile', function (Blueprint $table) {
            $table->index(['last_name', 'first_name'], 'idx_student_profile_name_search');
        });

        Schema::table('admin_profile', function (Blueprint $table) {
            $table->index(['last_name', 'first_name'], 'idx_admin_profile_name_search');
        });

        Schema::table('alumni_profile', function (Blueprint $table) {
            $table->index(['last_name', 'first_name'], 'idx_alumni_profile_name_search');
        });
    }

    public function down(): void
    {
        Schema::table('student_profile', function (Blueprint $table) {
            $table->dropIndex('idx_student_profile_name_search');
        });

        Schema::table('admin_profile', function (Blueprint $table) {
            $table->dropIndex('idx_admin_profile_name_search');
        });

        Schema::table('alumni_profile', function (Blueprint $table) {
            $table->dropIndex('idx_alumni_profile_name_search');
        });
    }
};
