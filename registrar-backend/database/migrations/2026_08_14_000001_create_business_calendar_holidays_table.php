<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Declared holidays / semestral-break days that fully close a given
 * business calendar for that date, regardless of what weekly_hours says
 * for that day-of-week. Rows here, not code changes — see the discussion
 * on why calendars needed to be data-driven from day one.
 *
 * `date` is a plain local calendar date (no time component, no timezone) —
 * it means "this whole local day is closed," not an instant.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('business_calendar_holidays')) {
            Schema::create('business_calendar_holidays', function (Blueprint $table) {
                $table->id('holiday_id');
                $table->foreignId('calendar_id')
                    ->constrained('business_calendars', 'calendar_id')
                    ->cascadeOnDelete();
                $table->date('date');
                $table->string('label', 255);
                $table->timestamps();

                // A calendar can't be closed twice on the same date — also
                // lets seeders/admin tools use updateOrInsert safely.
                $table->unique(['calendar_id', 'date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('business_calendar_holidays');
    }
};
