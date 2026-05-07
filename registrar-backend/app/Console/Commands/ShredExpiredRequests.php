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
|   processed_by = null / processed_by_email = 'system' distinguishes
|   automated transitions from manual admin updates.
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

        $requests = DocumentRequest::query()
            ->where('status_id', RequestStatusEnum::ReadyToClaim->value)
            ->whereNull('deleted_at')
            ->whereHas('history', function ($q) use ($cutoff) {
                $q->where('new_status_id', RequestStatusEnum::ReadyToClaim->value)
                  ->where('changed_at', '<=', $cutoff);
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
                    'processed_by'       => null,
                    'processed_by_email' => 'system',
                    'minutes_processed'  => (int) $request->requested_at->diffInMinutes(now()),
                ]);

                /** @var SystemUser $owner */
                $owner = $request->user;
                if ($owner instanceof SystemUser) {
                    $notificationService->send(
                        recipient:    $owner,
                        triggerEvent: 'reminder_final_warning',
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
