<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Generalizes business_calendar_holidays from "single declared holiday
 * date" into "any one-off dated closure" — the same table now also holds
 * class/office suspensions and one-off events (fumigation, team-building),
 * per the discussion following Step 4: these all behave identically to a
 * holiday for SLA purposes (fully closed for that date/range), they just
 * need a label and a reason category for the admin UI and the public
 * notice banner to distinguish them.
 *
 * `date` keeps its original meaning (start of the closure) so nothing
 * that already reads/writes it breaks. `end_date` is new and nullable —
 * null means "closes for just `date`," same behavior as before this
 * migration. A row with end_date set covers every day in [date, end_date]
 * inclusive.
 *
 * The old unique(calendar_id, date) is dropped: it was only ever meant to
 * stop the exact same day being declared closed twice, but multi-day
 * ranges make that guard both incomplete (doesn't stop overlapping
 * ranges) and occasionally wrong (nothing stops two different qualifying
 * reasons landing on the same start date, e.g. a suspension announced
 * mid-holiday-week). Overlap prevention belongs in the admin
 * service/validation layer, not a DB constraint, so admins get a clear
 * error instead of a raw SQL failure.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            if (!Schema::hasColumn('business_calendar_holidays', 'type')) {
                $table->string('type', 20)->default('holiday')->after('date');
            }
            if (!Schema::hasColumn('business_calendar_holidays', 'end_date')) {
                $table->date('end_date')->nullable()->after('date');
            }
        });

        // Every closure declared before this migration was a single-day
        // holiday — backfill end_date = date so existing rows keep
        // exactly the same meaning under the new range-aware read path.
        // Done via plain Eloquent (not a raw SQL column-to-column copy)
        // deliberately: `date` is a reserved word in some SQL dialects
        // and backtick-quoting it is MySQL-only syntax that would break
        // on Postgres — this table is small and this runs once, so
        // there's no reason to reach for raw SQL here at all.
        DB::table('business_calendar_holidays')
            ->whereNull('end_date')
            ->orderBy('holiday_id')
            ->get(['holiday_id', 'date'])
            ->each(function ($row) {
                DB::table('business_calendar_holidays')
                    ->where('holiday_id', $row->holiday_id)
                    ->update(['end_date' => $row->date]);
            });

        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            $indexes = collect(Schema::getIndexes('business_calendar_holidays'))->pluck('name');

            // Create the replacement index BEFORE dropping the old unique
            // index. calendar_id's foreign key needs some index covering it
            // at all times — on MySQL/InnoDB the old unique(calendar_id,
            // date) was silently doing that job (calendar_id is its
            // leftmost column). If we drop it first, there's a moment where
            // no index covers calendar_id and MySQL refuses with error 1553
            // ("needed in a foreign key constraint"). Blueprint commands run
            // as separate sequential ALTER TABLE statements, not one atomic
            // statement, so ordering here is significant. This new index
            // also starts with calendar_id, so it takes over as the FK's
            // supporting index the moment it's created, making the old
            // unique index safe to drop right after.
            if (!$indexes->contains('bch_calendar_range_idx')) {
                $table->index(['calendar_id', 'date', 'end_date'], 'bch_calendar_range_idx');
            }

            if ($indexes->contains('business_calendar_holidays_calendar_id_date_unique')) {
                $table->dropUnique('business_calendar_holidays_calendar_id_date_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('business_calendar_holidays', function (Blueprint $table) {
            // Same ordering constraint as up(): add the restored unique
            // index BEFORE dropping bch_calendar_range_idx, so calendar_id
            // never goes a moment without an index covering its foreign
            // key. Reversing this order reproduces MySQL error 1553 on
            // rollback for the same reason it hit on the forward migration.
            $table->unique(['calendar_id', 'date']);
            $table->dropIndex('bch_calendar_range_idx');
            $table->dropColumn(['type', 'end_date']);
        });
    }
};