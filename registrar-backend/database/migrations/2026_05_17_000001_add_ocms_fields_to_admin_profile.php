<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds OCMS-sourced fields to the admin_profile table.
 *
 * These columns are populated from the OCMS Central Admin Profile Hub
 * on every admin/super_admin login via OcmsAdminService::provisionAdminProfile().
 *
 * All columns are nullable — the hub may not have every field for all
 * admins, and the app must degrade gracefully when OCMS is unreachable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_profile', function (Blueprint $table) {
            // first_name / middle_name / last_name / suffix already exist
            $table->string('office', 150)->nullable()->after('suffix');
            $table->string('contact_no', 30)->nullable()->after('office');
            $table->string('emergency_contact_person', 150)->nullable()->after('contact_no');
            $table->date('birthday')->nullable()->after('emergency_contact_person');
            $table->string('gender', 30)->nullable()->after('birthday');
            $table->string('civil_status', 30)->nullable()->after('gender');
            $table->text('address')->nullable()->after('civil_status');
        });
    }

    public function down(): void
    {
        Schema::table('admin_profile', function (Blueprint $table) {
            $table->dropColumn([
                'office',
                'contact_no',
                'emergency_contact_person',
                'birthday',
                'gender',
                'civil_status',
                'address',
            ]);
        });
    }
};
