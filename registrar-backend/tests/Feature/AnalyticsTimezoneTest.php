<?php

use App\Models\DocumentRequest;
use App\Models\RequestPurpose;
use App\Models\RequestStatus;
use App\Models\SystemUser;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Regression test for the peak-hours timezone bug:
 *
 * requested_at is stored in UTC. A request submitted at 1:15 PM Asia/Manila
 * time (UTC+8) is stored as 5:15 AM UTC. Before the fix, peakHours() read
 * the hour straight off the UTC column, so a 1 PM local request showed up
 * bucketed under "05:00" — a phantom pre-dawn spike that wasn't real.
 *
 * This test creates a request at a known local time and asserts it lands
 * in the local-hour bucket, not the UTC-hour bucket.
 */
test('peak hours reports the local Asia/Manila hour, not the raw UTC hour', function () {
    config(['app.display_timezone' => 'Asia/Manila']); // UTC+8, no DST

    $status  = RequestStatus::firstOrCreate(['status_id' => 1], ['status_name' => 'Processing']);
    $purpose = RequestPurpose::firstOrCreate(['request_purpose_id' => 1], ['purpose_name' => 'DFA']);
    $user    = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT, 'status' => 'Activated']);

    // 1:15 PM Manila time == 5:15 AM UTC. Store the raw UTC instant, the
    // same way the app does (Eloquent casts persist datetimes as UTC).
    $localNoonish = \Carbon\Carbon::parse('2026-03-10 13:15:00', 'Asia/Manila');

    DocumentRequest::factory()->create([
        'user_id'            => $user->user_id,
        'status_id'          => $status->status_id,
        'request_purpose_id' => $purpose->request_purpose_id,
        'requested_at'       => $localNoonish,
    ]);

    $service = new AnalyticsService();
    $hours   = $service->peakHours([
        \Carbon\Carbon::parse('2026-03-10 00:00:00', 'UTC'),
        \Carbon\Carbon::parse('2026-03-11 00:00:00', 'UTC'),
    ]);

    $byHour = collect($hours)->keyBy('hour');

    expect($byHour[13]['total'])->toBe(1) // 1 PM local — correct bucket
        ->and($byHour[5]['total'])->toBe(0); // 5 AM UTC — the old, wrong bucket
});
