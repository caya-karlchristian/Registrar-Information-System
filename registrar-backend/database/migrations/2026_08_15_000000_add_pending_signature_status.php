<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the "Pending Signature" status (status_id = 6) and the
 * request_history.business_minutes column that makes it meaningful.
 *
 * BACKGROUND — why status_id 6 specifically:
 * A prior attempt seeded a "Pending" row at status_id 6 and it silently
 * hijacked StaffDashboard's PENDING lookup (staffDashboardUtils.js resolves
 * PENDING by matching status_name.toLowerCase() === 'pending', which used
 * to fall back to status_id 1/"Processing" when no such row existed — see
 * DatabaseSeeder::seedRequestStatus()). This migration reuses slot 6 (it
 * was never actually used by real data — see the CORRECTNESS CHECK below)
 * but names the row "Pending Signature", which lowercases to
 * "pending signature" and therefore does NOT collide with the "pending"
 * lookup key. Confirmed no frontend code does an exact match on that
 * string either (staffDashboardUtils.js, StaffDashboardComponents.jsx).
 *
 * WHY A NEW COLUMN INSTEAD OF REUSING minutes_processed:
 * minutes_processed is written as diffInMinutes(requested_at, now()) on
 * EVERY transition — i.e. it's cumulative time since the request was
 * filed, not the time spent in the status just being exited. Existing
 * reports (AnalyticsService::processingTime, byDocumentType) already
 * consume it with that cumulative meaning, and changing its semantics
 * out from under them would silently corrupt historical comparisons.
 * business_minutes is additive: a NEW, per-segment, calendar-aware
 * duration (via BusinessCalendarService) measuring only the time elapsed
 * since the PREVIOUS status change. That is what lets us fairly say
 * "the registrar's own clock stopped the moment they moved this to
 * Pending Signature" and separately "the signing office took N business
 * hours to sign it" — two different numbers that minutes_processed
 * cannot represent on its own.
 *
 * IMPORTANT — run before deploying to a database with real data:
 *   SELECT COUNT(*) FROM document_request WHERE status_id = 6;
 *   SELECT COUNT(*) FROM request_history  WHERE old_status_id = 6 OR new_status_id = 6;
 *   Expected: 0 for both. RequestStatusEnum::allowedTransitions() has
 *   never permitted any status to transition TO id 6 (the deprecated
 *   "Pending" attempt was caught before it shipped, per the comment this
 *   migration's row replaces in DatabaseSeeder::seedRequestStatus()), so
 *   there should be no legacy rows silently reinterpreted as "Pending
 *   Signature" by this change. If either query returns non-zero, STOP —
 *   pick a different status_id and adjust RequestStatusEnum accordingly
 *   before proceeding.
 *
 * IDEMPOTENCY NOTE: written the same defensive way as the other
 * post-launch migrations in this project — safe to re-run from any
 * partial state.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('request_status')->updateOrInsert(
            ['status_id' => 6],
            ['status_name' => 'Pending Signature']
        );

        if (!Schema::hasColumn('request_history', 'business_minutes')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->integer('business_minutes')
                    ->nullable()
                    ->after('minutes_processed')
                    ->comment('Calendar-aware minutes elapsed since the previous status change (or requested_at, for the first transition), counting only minutes inside the relevant business calendar\'s office hours. See BusinessCalendarService.');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('request_history', 'business_minutes')) {
            Schema::table('request_history', function (Blueprint $table) {
                $table->dropColumn('business_minutes');
            });
        }

        // Only remove the status row if nothing references it — mirrors
        // the caution in the other rollback migrations in this project.
        // If real requests have since used it, leave it in place rather
        // than breaking their status FK on rollback.
        $inUse = DB::table('document_request')->where('status_id', 6)->exists()
            || DB::table('request_history')->where('old_status_id', 6)->orWhere('new_status_id', 6)->exists();

        if (!$inUse) {
            DB::table('request_status')->where('status_id', 6)->delete();
        }
    }
};
