<?php

namespace App\Console\Commands;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use App\Contracts\NotificationServiceInterface;
use App\Services\Concerns\FlushesAnalyticsCache;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/*
|--------------------------------------------------------------------------
| ShredExpiredRequests
|--------------------------------------------------------------------------
| Runs daily via the Laravel scheduler (see routes/console.php).
| Scheduled BEFORE SendUnclaimedReminders so a request expiring on day 90
| is forfeited rather than receiving a 7-day reminder on the same day.
|
| Policy
|   If a document request has been in "ReadyToClaim" status for 90 or
|   more days, it is automatically transitioned to Forfeited and the
|   student is notified that their documents have been shredded.
|
| Audit trail
|   A RequestHistory row is written for every automated transition so
|   admin reports remain consistent with manual status changes.
|   changed_by = null / processed_by_email = 'system' distinguishes
|   automated transitions from manual admin updates (see migration
|   2026_07_08_000001_consolidate_request_history_actor — processed_by
|   was dropped; changed_by is now the single actor column).
|
| Idempotency
|   The status is immediately updated to Forfeited inside the same DB
|   transaction, so re-running the command finds no qualifying rows.
|--------------------------------------------------------------------------
*/

class ShredExpiredRequests extends Command
{
    use FlushesAnalyticsCache;

    protected $signature   = 'notifications:shred-expired-requests';
    protected $description = 'Auto-forfeit ReadyToClaim requests unclaimed for 90+ days and notify the student';

    public function handle(NotificationServiceInterface $notificationService): int
    {
        $cutoff = Carbon::now()->subDays(90);

        // Use the MOST RECENT ReadyToClaim history row, not the oldest.
        // If a request was ever cycled back through Processing and then
        // set ReadyToClaim again, the 90-day clock should restart from the
        // latest transition — not from the original one.
        //
        // NOTE: this is deliberately a raw whereExists() rather than
        // whereHas('history', ...). whereHas()'s automatic "select 1"
        // existence-subquery optimization does not apply once the
        // closure adds its own groupBy()/havingRaw(), so Eloquent falls
        // back to selecting request_history's full column list. Combined
        // with GROUP BY request_id, that trips MySQL's ONLY_FULL_GROUP_BY
        // mode (every unaggregated column in the SELECT list must be in
        // the GROUP BY). Building the subquery explicitly with
        // select(DB::raw(1)) sidesteps that entirely and doesn't depend
        // on Eloquent's relation-existence internals staying the same
        // across versions.
        $requests = DocumentRequest::query()
            ->where('status_id', RequestStatusEnum::ReadyToClaim->value)
            ->whereExists(function ($query) use ($cutoff) {
                $query->select(DB::raw(1))
                    ->from('request_history')
                    ->whereColumn('request_history.request_id', 'document_request.request_id')
                    ->where('request_history.new_status_id', RequestStatusEnum::ReadyToClaim->value)
                    ->groupBy('request_history.request_id')
                    ->havingRaw('MAX(request_history.changed_at) <= ?', [$cutoff]);
            })
            ->with('user')
            ->get();

        $shredded = 0;

        foreach ($requests as $request) {
            DB::transaction(function () use ($request, $notificationService, &$shredded) {
                $oldStatusId = $request->status_id;

                $request->update(['status_id' => RequestStatusEnum::Forfeited->value]);

                RequestHistory::create([
                    'request_id'         => $request->request_id,
                    'old_status_id'      => $oldStatusId,
                    'new_status_id'      => RequestStatusEnum::Forfeited->value,
                    'changed_at'         => now(),
                    'changed_by'         => null,
                    'processed_by_email' => 'system',
                    'minutes_processed'  => (int) $request->requested_at->diffInMinutes(now()),
                ]);

                /** @var SystemUser $owner */
                $owner = $request->user;
                if ($owner instanceof SystemUser) {
                    // Use 'request_forfeited' — documents have already been
                    // shredded at this point, so the message must be past-tense.
                    // 'reminder_final_warning' (future-tense) was incorrect here.
                    $notificationService->send(
                        recipient:    $owner,
                        triggerEvent: 'request_forfeited',
                        data:         ['request_id' => $request->request_id],
                        requestId:    $request->request_id,
                    );
                }

                $shredded++;
                Log::info('[ShredExpiredRequests] request forfeited', [
                    'request_id' => $request->request_id,
                    'user_id'    => $owner?->user_id,
                ]);
            });
        }

        $this->info("[ShredExpiredRequests] {$shredded} request(s) forfeited.");

        // QA bugs #4/#9 ("Forfeited Count Mismatch" / "Forfeited Missing
        // from Admin Analytics") — this command writes status_id
        // directly to the DB via a bare $request->update(), bypassing
        // DocumentRequestService::updateRequest() entirely, which is the
        // only other place that used to invalidate the "analytics"
        // cache. That meant an auto-forfeiture from this cron could
        // leave the Forfeited summary card and detail table
        // disagreeing for up to 10 minutes — exactly the symptom QA
        // reported. Flushed ONCE after the loop (not per-row): a tag
        // flush clears everything regardless of row count, so per-row
        // flushing would just be N-1 wasted Redis round trips for the
        // same result. Skipped entirely when nothing was forfeited, to
        // avoid a pointless cache round trip on the common no-op run.
        if ($shredded > 0) {
            $this->flushAnalyticsCache();
        }

        return self::SUCCESS;
    }
}