<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds an 'enabled' kill switch to both calendar closure mechanisms,
 * mirroring Announcement::enabled. Lets an admin temporarily deactivate a
 * declared closure or recurring override — e.g. a suspension that got
 * called off, or a WFH policy that's paused but might come back — without
 * losing the record entirely the way delete() would. A disabled row is
 * inert everywhere it matters (BusinessCalendarService no longer loads it,
 * so it can't close the office; CalendarException/OverrideService's
 * overlap checks ignore it, so it doesn't block a new declaration
 * covering the same dates) while remaining visible and re-enable-able in
 * the admin list.
 *
 * Defaults to true so every existing row stays exactly as active as it
 * was before this migration ran.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            $table->boolean('enabled')->default(true)->after('label');
        });

        Schema::table('business_calendar_overrides', function (Blueprint $table) {
            $table->boolean('enabled')->default(true)->after('label');
        });
    }

    public function down(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            $table->dropColumn('enabled');
        });

        Schema::table('business_calendar_overrides', function (Blueprint $table) {
            $table->dropColumn('enabled');
        });
    }
};
