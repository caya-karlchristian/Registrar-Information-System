<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Inserts the 'awaiting_submission' notification_type row (id 24), fired
 * by DocumentRequestService::createRequest() when a new request starts
 * in RequestStatusEnum::AwaitingSubmission.
 *
 * NOTE ON WHY THIS MIGRATION EXISTS (and isn't just a seeder change):
 * NotificationService::send() does a DB lookup on notification_types by
 * trigger_event and silently no-ops (logs a warning, returns null) if no
 * active row matches — it does not throw. 'pending_signature'
 * (notification_type_id 21, added alongside RequestStatusEnum::
 * PendingSignature) was only ever added to DatabaseSeeder.php, with no
 * equivalent migration — meaning any database that was already deployed
 * before that change, and only ever ran `migrate` (not a fresh
 * `db:seed`), never got that row and has been silently swallowing
 * 'pending_signature' notifications ever since. Worth checking
 * separately; not fixed here to keep this change scoped to what it's
 * actually adding. This migration exists so 'awaiting_submission' does
 * NOT end up in that same silently-broken state on any environment that
 * only runs migrations.
 *
 * IDEMPOTENCY: updateOrInsert, safe to re-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('notification_types')->updateOrInsert(
            ['trigger_event' => 'awaiting_submission'],
            [
                'notification_type_id' => 24,
                'title'                => 'Source Document Required',
                'message_template'     => 'Your request includes an item that requires you to submit the original source document before processing can begin. Please see the requirements list for details.',
                'audience'             => 'student_alumni',
                'is_active'            => 1,
            ]
        );
    }

    public function down(): void
    {
        DB::table('notification_types')->where('trigger_event', 'awaiting_submission')->delete();
    }
};
