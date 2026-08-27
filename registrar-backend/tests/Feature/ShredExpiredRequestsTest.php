<?php

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan notifications:shred-expired-requests`
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Creates a ReadyToClaim request whose most recent ReadyToClaim history
 * entry is $daysAgo old — i.e. what ShredExpiredRequests actually keys
 * off (see its "Use the MOST RECENT ReadyToClaim history row" comment).
 */
function serCreateReadyToClaimRequest(int $daysAgo): DocumentRequest
{
    $owner = SystemUser::factory()->create();

    $request = DocumentRequest::factory()->create([
        'user_id'      => $owner->user_id,
        'status_id'    => RequestStatusEnum::ReadyToClaim->value,
        'requested_at' => now()->subDays($daysAgo + 5),
    ]);

    RequestHistory::create([
        'request_id'        => $request->request_id,
        'old_status_id'     => RequestStatusEnum::Processing->value,
        'new_status_id'     => RequestStatusEnum::ReadyToClaim->value,
        'changed_at'        => now()->subDays($daysAgo),
        'changed_by'        => null,
        'processed_by_email' => 'system-test',
        'minutes_processed' => 60,
    ]);

    return $request;
}

test('forfeits a request that has been ReadyToClaim for 90+ days', function () {
    $stale = serCreateReadyToClaimRequest(daysAgo: 95);
    $fresh = serCreateReadyToClaimRequest(daysAgo: 10);

    $this->artisan('notifications:shred-expired-requests')->assertExitCode(0);

    expect($stale->fresh()->status_id)->toBe(RequestStatusEnum::Forfeited->value);
    expect($fresh->fresh()->status_id)->toBe(RequestStatusEnum::ReadyToClaim->value);

    $this->assertDatabaseHas('request_history', [
        'request_id'     => $stale->request_id,
        'new_status_id'  => RequestStatusEnum::Forfeited->value,
        'changed_by'     => null,
    ]);
});

test('flushes the analytics cache when a request is forfeited (QA bugs #4 / #9)', function () {
    // Bug: this command writes status_id directly, bypassing
    // DocumentRequestService::updateRequest() (the only place that used
    // to invalidate the "analytics" cache), so the Forfeited summary
    // card and detail table could disagree for up to 10 minutes after
    // an auto-forfeiture. Simulated the same way
    // SuperAdminAnalyticsControllerTest does: seed a key under the
    // shared tag, run the command, assert the key is gone.
    serCreateReadyToClaimRequest(daysAgo: 95);
    Cache::tags(['analytics'])->put('probe', 'stale', now()->addMinutes(10));

    $this->artisan('notifications:shred-expired-requests')->assertExitCode(0);

    expect(Cache::tags(['analytics'])->has('probe'))->toBeFalse();
});

test('does not touch the analytics cache when nothing is forfeited', function () {
    // Efficiency check for the "flush once after the loop, skip
    // entirely on a no-op run" behavior described in the command.
    serCreateReadyToClaimRequest(daysAgo: 10); // not old enough
    Cache::tags(['analytics'])->put('probe', 'still-fresh', now()->addMinutes(10));

    $this->artisan('notifications:shred-expired-requests')->assertExitCode(0);

    expect(Cache::tags(['analytics'])->has('probe'))->toBeTrue();
});