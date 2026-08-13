<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brings access_requests in line with admin_profile, which already has a
 * nullable middle_name column (see 2026_04_01_000000_create_base_schema.php)
 * that AdminUserService::create() happily accepts. Without this, a request
 * submitted through the self-service flow can never carry a middle name
 * through to the SystemUser it eventually creates on approval.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->string('target_middle_name', 100)->nullable()->after('target_first_name');
        });
    }

    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->dropColumn('target_middle_name');
        });
    }
};
