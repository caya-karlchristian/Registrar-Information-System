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
| It MUST be scheduled before SendUnclaimedReminders so that a request
| hitting exactly 90 days is forfeited first and does not also receive
| a 7-day reminder on the same day.
|
| Policy
|   If a document request has been in "ReadyToClaim" status for 90 or
|   more days, it is automatically transitioned to Forfeited and the
|   student is notified that their documents have been shredded.
|
| Audit trail
|   A RequestHistory row is written for every automated transition so
|   admin reports remain consistent with manual status changes.
|
| Idempotency
|   The status is immediately updated to Forfeited inside the same
|   DB transaction as the notification write, so re-running the command
|   will simply find no qualifying rows.
|--------------------------------------------------------------------------
*/

class ShredExpiredRequests extends Command
{
    protected $signature   = 'notifications:shred-expired-requests';
    protected $description = 'Auto-forfeit ReadyToClaim requests that have been unclaimed for 90+ days and notify the student';

    public function handle(NotificationServiceInterface $notificationService): int
    {
        $cutoff = Carbon::now()->subDays(90);

        // Find every still-unclaimed ReadyToClaim request where the
        // status transition happened 90 or more days ago.
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

                // 1. Transition to Forfeited.
                $request->update(['status_id' => RequestStatusEnum::Forfeited->value]);

                // 2. Write audit history.
                //    processed_by is null because this is a system action;
                //    processed_by_email = 'system' preserves readability in
                //    admin audit reports without requiring a real user FK.
                RequestHistory::create([
                    'request_id'         => $request->request_id,
                    'old_status_id'      => $oldStatusId,
                    'new_status_id'      => RequestStatusEnum::Forfeited->value,
                    'changed_at'         => now(),
                    'processed_by'       => null,
                    'processed_by_email' => 'system',
                    'minutes_processed'  => (int) $request->requested_at->diffInMinutes(now()),
                ]);

                // 3. Notify the student.
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
