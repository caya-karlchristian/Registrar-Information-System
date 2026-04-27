<?php

namespace App\Jobs;

use App\Models\SystemUser;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/*
|--------------------------------------------------------------------------
| SendBulkNotificationJob
|--------------------------------------------------------------------------
| Dispatched by NotificationService::sendToAdmins() and sendToAllExcept()
| so that bulk notification loops run in the background queue worker
| instead of blocking the HTTP response.
|
| Each individual NotificationService::send() call inside the job still
| saves a DB row AND fires the per-user Reverb broadcast — the only thing
| that moved off the request thread is the outer loop.
|--------------------------------------------------------------------------
*/
class SendBulkNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted before it is marked failed.
     * 3 retries with exponential back-off gives resilience without hammering
     * the DB on a transient error.
     */
    public int $tries = 3;

    /**
     * @param  string      $triggerEvent    e.g. 'admin_new_request'
     * @param  array       $data            Placeholder values for the message template
     * @param  int[]       $excludedRoleIds Role IDs to skip (empty = send to everyone)
     * @param  int[]       $onlyRoleIds     Role IDs to target (empty = all minus excluded)
     * @param  int|null    $requestId       FK to document_requests (nullable)
     */
    public function __construct(
        public readonly string $triggerEvent,
        public readonly array  $data           = [],
        public readonly array  $excludedRoleIds = [],
        public readonly array  $onlyRoleIds     = [],
        public readonly ?int   $requestId       = null,
    ) {}

    public function handle(): void
    {
        $query = SystemUser::where('status', 'Activated');

        if (!empty($this->onlyRoleIds)) {
            $query->whereIn('role_id', $this->onlyRoleIds);
        } elseif (!empty($this->excludedRoleIds)) {
            $query->whereNotIn('role_id', $this->excludedRoleIds);
        }

        foreach ($query->cursor() as $user) {
            NotificationService::send(
                recipient:    $user,
                triggerEvent: $this->triggerEvent,
                data:         $this->data,
                requestId:    $this->requestId,
            );
        }
    }
}
