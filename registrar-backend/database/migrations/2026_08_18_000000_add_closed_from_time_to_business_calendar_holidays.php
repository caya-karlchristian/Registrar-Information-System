<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds partial-day closures on top of the existing full-day-only model.
 * Scoped to business_calendar_holidays only — recurring overrides stay
 * whole-day-only for now (see BusinessCalendarService's dayWindow()
 * docblock for the full behavior this powers).
 *
 * closed_from_time NULL (the default) means today's exact current
 * behavior: the whole local day is closed. Set means "the office was
 * open normally until this time, then this closure took effect" — and
 * only ever applies to the exception's own start date (`date`), never
 * `end_date` or any day in between for a multi-day range.
 *
 * Nullable with no default so every existing row is completely
 * unaffected by this migration — a pre-existing closure is still read
 * as a full-day closure with zero behavior change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            if (!Schema::hasColumn('business_calendar_holidays', 'closed_from_time')) {
                $table->time('closed_from_time')->nullable()->after('end_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            $table->dropColumn('closed_from_time');
        });
    }
};
