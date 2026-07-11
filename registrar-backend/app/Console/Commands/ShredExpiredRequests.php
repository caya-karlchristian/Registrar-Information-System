<?php

namespace App\Console\Commands;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use App\Contracts\NotificationServiceInterface;
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
    protected $signature   = 'notifications:shred-expired-requests';
    protected $description = 'Auto-forfeit ReadyToClaim requests unclaimed for 90+ days and notify the student';

    public function handle(NotificationServiceInterface $notificationService): int
    {
        $cutoff = Carbon::now()->subDays(90);

        // Use the MOST RECENT ReadyToClaim history row, not the oldest.
        // If a request was ever cycled back through Processing and then
        // set ReadyToClaim again, the 90-day clock should restart from the
        // latest transition — not from the original one.
        $requests = DocumentRequest::query()
            ->where('status_id', RequestStatusEnum::ReadyToClaim->value)
            ->whereHas('history', function ($q) use ($cutoff) {
                $q->where('new_status_id', RequestStatusEnum::ReadyToClaim->value)
                  ->havingRaw('MAX(changed_at) <= ?', [$cutoff])
                  ->groupBy('request_id');
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
        return self::SUCCESS;
    }
}