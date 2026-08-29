<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds the "Awaiting Submission" status (status_id = 12) — the starting
 * status for a request that contains at least one document/certificate
 * type with requires_source_submission = true (the CTC / Authentication
 * Fee case). See RequestStatusEnum::AwaitingSubmission for the full
 * reasoning and DocumentRequestService::createRequest() for where it's
 * assigned.
 *
 * WHY id 12: the highest existing status_id is 11 ("Draft" — see
 * DatabaseSeeder::seedRequestStatus()), so 12 is simply the next free
 * slot. Named "Awaiting Submission", which lowercases to
 * "awaiting submission" — NOT an exact match on "pending" — so it does
 * not collide with the frontend's exact-match "pending" lookup
 * (staffDashboardUtils.js), the same landmine documented at length in
 * DatabaseSeeder::seedRequestStatus() and in the 2026_08_15_000000_
 * add_pending_signature_status migration this one otherwise mirrors.
 *
 * IMPORTANT — run before deploying to a database with real data:
 *   SELECT COUNT(*) FROM document_request WHERE status_id = 12;
 *   SELECT COUNT(*) FROM request_history  WHERE old_status_id = 12 OR new_status_id = 12;
 *   Expected: 0 for both — nothing could have used status_id 12 before
 *   this migration exists. If either query returns non-zero, STOP and
 *   investigate before proceeding; something else has claimed this id.
 *
 * IDEMPOTENCY: written the same defensive, re-runnable way as the rest
 * of this migration set.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('request_status')->updateOrInsert(
            ['status_id' => 12],
            ['status_name' => 'Awaiting Submission']
        );
    }

    public function down(): void
    {
        // Only remove the status row if nothing references it — mirrors
        // the same caution used in 2026_08_15_000000_add_pending_
        // signature_status's rollback.
        $inUse = DB::table('document_request')->where('status_id', 12)->exists()
            || DB::table('request_history')->where('old_status_id', 12)->orWhere('new_status_id', 12)->exists();

        if (!$inUse) {
            DB::table('request_status')->where('status_id', 12)->delete();
        }
    }
};
