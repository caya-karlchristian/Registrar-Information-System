<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brings access_requests fully in line with admin_profile, which has had
 * a nullable suffix column (max 20 chars) since the base schema. Unlike
 * target_middle_name (added in 2026_08_16_000000), target_suffix was
 * never added here at all — QA caught that a target admin's suffix
 * (Jr., III, etc.) has no field anywhere in the self-service access
 * request flow, even though AdminUserService::create() already accepts
 * and writes a 'suffix' key directly (that's what the "add admin
 * directly" flow in UserModal.jsx uses). Without this column, an
 * approved access request can never carry a suffix through to the
 * SystemUser/admin_profile row it creates.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->string('target_suffix', 20)->nullable()->after('target_last_name');
        });
    }

    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->dropColumn('target_suffix');
        });
    }
};
