<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Business Calendars — the shared "elapsed time engine" backing both the
 * office-hours SLA fix and the upcoming Pending-Signature turnaround metric
 * (see the two features discussed together: registrar office hours /
 * weekend closures, and per-office signature turnaround).
 *
 * Rather than hardcoding "Mon–Fri, 8am–8pm" into the SLA calculation, every
 * office/signatory that has a clock running against it (the Registrar
 * itself, and later each external signing office) points at a row here.
 * `is_default` marks the one calendar new offices fall back to until an
 * admin gives them their own — see the docblock on BusinessCalendarService
 * for how weekly_hours/holidays are actually applied.
 *
 * weekly_hours is stored as JSON keyed by lowercase day name:
 *   {
 *     "monday":    {"open": "08:00", "close": "20:00"},
 *     "tuesday":   {"open": "08:00", "close": "20:00"},
 *     ...
 *     "saturday":  null,
 *     "sunday":    null
 *   }
 * A null value (or a missing key) means closed all day. Times are plain
 * "HH:MM" 24-hour local wall-clock strings in config('app.display_timezone')
 * — never store these as UTC, they're a schedule, not an instant.
 *
 * Written idempotently (Schema::hasTable / count-gated insert), matching
 * the style of the other migrations in this project.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('business_calendars')) {
            Schema::create('business_calendars', function (Blueprint $table) {
                $table->id('calendar_id');
                $table->string('name', 255);
                // Exactly one calendar should be the fallback. Enforced in
                // application code (BusinessCalendarService::assignDefault)
                // rather than a DB-level "only one true" constraint, since
                // that constraint isn't portable across MySQL/SQLite/Postgres
                // without a partial/filtered unique index per driver.
                $table->boolean('is_default')->default(false);
                $table->json('weekly_hours');
                $table->timestamps();

                $table->index('is_default');
            });
        }

        // Seed the Registrar's confirmed hours as the one Default calendar.
        // Every office added later (Step 3+) points at this until it's
        // given its own — zero behavior change for the Registrar itself.
        if (DB::table('business_calendars')->count() === 0) {
            $openClose = ['open' => '08:00', 'close' => '20:00'];

            DB::table('business_calendars')->insert([
                'name'         => 'Default University Hours',
                'is_default'   => true,
                'weekly_hours' => json_encode([
                    'monday'    => $openClose,
                    'tuesday'   => $openClose,
                    'wednesday' => $openClose,
                    'thursday'  => $openClose,
                    'friday'    => $openClose,
                    'saturday'  => null,
                    'sunday'    => null,
                ]),
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('business_calendars');
    }
};
