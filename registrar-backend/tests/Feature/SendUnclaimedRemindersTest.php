<?php

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\Notification;
use App\Models\NotificationType;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan notifications:send-unclaimed-reminders`
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Creates a ReadyToClaim request whose most recent ReadyToClaim history
 * entry is $daysAgo old — mirrors serCreateReadyToClaimRequest() in
 * ShredExpiredRequestsTest so both commands are exercised against the
 * same request shape.
 */
function surCreateReadyToClaimRequest(int $daysAgo): DocumentRequest
{
    $owner = SystemUser::factory()->create();

    $request = DocumentRequest::factory()->create([
        'user_id'      => $owner->user_id,
        'status_id'    => RequestStatusEnum::ReadyToClaim->value,
        'requested_at' => now()->subDays($daysAgo + 5),
    ]);

    RequestHistory::create([
        'request_id'         => $request->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => RequestStatusEnum::ReadyToClaim->value,
        'changed_at'         => now()->subDays($daysAgo),
        'changed_by'         => null,
        'processed_by_email' => 'system-test',
        'minutes_processed'  => 60,
    ]);

    return $request;
}

test('sends a reminder for a request that has been ReadyToClaim for exactly 7 days', function () {
    $request = surCreateReadyToClaimRequest(daysAgo: 7);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseHas('notifications', [
        'notifiable_type' => SystemUser::class,
        'notifiable_id'   => $request->user_id,
        'request_id'      => $request->request_id,
    ]);

    $notification = Notification::where('request_id', $request->request_id)->firstOrFail();
    $type         = NotificationType::find($notification->notification_type_id);
    expect($type->trigger_event)->toBe('reminder_claim');
});

test('does not send a reminder for a request younger than 7 days', function () {
    surCreateReadyToClaimRequest(daysAgo: 2);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseCount('notifications', 0);
});

test('does not send a reminder once the request has aged past the 24h catch window', function () {
    // Documents the current window-based trade-off: the job keys off a
    // rolling [now-8d, now-7d] window, so a request that was already
    // 10 days old the first time this ran (e.g. the cron missed a day)
    // will NOT get a reminder — it will simply proceed toward the
    // 90-day forfeiture with no 7-day warning ever sent. If that's not
    // the intended behavior, the fix belongs in this command (e.g.
    // "any ReadyToClaim request with no reminder yet and age >= 7 days"
    // instead of the tight window), not in the test.
    surCreateReadyToClaimRequest(daysAgo: 10);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseCount('notifications', 0);
});

test('does not send a duplicate reminder if one was already sent for the request', function () {
    $request = surCreateReadyToClaimRequest(daysAgo: 7);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);
    $this->assertDatabaseCount('notifications', 1);

    // Re-run the same command again (e.g. cron retried after a crash).
    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseCount('notifications', 1);
});

test('does not send a reminder for a request that is not ReadyToClaim', function () {
    $owner = SystemUser::factory()->create();

    $request = DocumentRequest::factory()->create([
        'user_id'      => $owner->user_id,
        'status_id'    => RequestStatusEnum::Processing->value,
        'requested_at' => now()->subDays(12),
    ]);

    RequestHistory::create([
        'request_id'         => $request->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => RequestStatusEnum::ReadyToClaim->value,
        'changed_at'         => now()->subDays(7),
        'changed_by'         => null,
        'processed_by_email' => 'system-test',
        'minutes_processed'  => 60,
    ]);

    // Then moved OUT of ReadyToClaim again (e.g. sent back to Processing).
    $request->update(['status_id' => RequestStatusEnum::Processing->value]);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseCount('notifications', 0);
});

test('sends independent reminders for multiple distinct requests in the window', function () {
    $a = surCreateReadyToClaimRequest(daysAgo: 7);
    $b = surCreateReadyToClaimRequest(daysAgo: 8);

    $this->artisan('notifications:send-unclaimed-reminders')->assertExitCode(0);

    $this->assertDatabaseHas('notifications', ['request_id' => $a->request_id]);
    $this->assertDatabaseHas('notifications', ['request_id' => $b->request_id]);
    $this->assertDatabaseCount('notifications', 2);
});
