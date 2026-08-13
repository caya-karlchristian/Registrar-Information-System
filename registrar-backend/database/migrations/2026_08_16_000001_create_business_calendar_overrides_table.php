<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recurring, time-bound overrides to a calendar's weekly_hours baseline —
 * built for policies like "no walk-in/processing every Monday while the
 * government's fuel-saving WFH directive is in effect," where:
 *   - it repeats on a fixed day of the week (unlike business_calendar_holidays,
 *     which is one-off dated closures: suspensions, fumigation, events)
 *   - it has an open-ended lifespan — nobody knows when the directive
 *     ends, so effective_until must support NULL ("indefinite, until
 *     someone sets an end date")
 *
 * A row here does NOT touch weekly_hours on business_calendars — the
 * baseline schedule stays the source of truth for "normal" days, and an
 * override is only consulted for the specific day_of_week/date-range it
 * declares. This keeps the common case (no active override) a zero-cost
 * lookup and means turning WFH Mondays off later is just setting
 * effective_until, never a schema or weekly_hours edit.
 *
 * is_closed exists (rather than always assuming true) so a future
 * override that changes hours without fully closing the day — e.g. "WFH
 * Mondays but the registrar still processes online requests, just no
 * walk-in claiming" — can reuse this same table instead of a new one.
 * BusinessCalendarService currently only acts on is_closed = true.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('business_calendar_overrides')) {
            Schema::create('business_calendar_overrides', function (Blueprint $table) {
                $table->id('override_id');
                $table->foreignId('calendar_id')
                    ->constrained('business_calendars', 'calendar_id')
                    ->cascadeOnDelete();

                // Lowercase day name, matching weekly_hours' JSON keys
                // (see BusinessCalendar docblock) so the service can
                // compare them directly with no translation table.
                $table->string('day_of_week', 10);

                $table->boolean('is_closed')->default(true);
                $table->string('label', 255);

                $table->date('effective_from');
                $table->date('effective_until')->nullable(); // null = indefinite

                $table->timestamps();

                $table->index(['calendar_id', 'day_of_week']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('business_calendar_overrides');
    }
};
