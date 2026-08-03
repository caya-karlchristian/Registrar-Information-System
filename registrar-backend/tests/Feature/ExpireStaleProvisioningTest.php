<?php

use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan provisioning:expire-stale`
// ═════════════════════════════════════════════════════════════════════════════

test('expires a Pending Activation user past pending_expires_at', function () {
    $stale = SystemUser::factory()->create([
        'status'             => 'Pending Activation',
        'pending_expires_at' => now()->subDay(),
    ]);

    $fresh = SystemUser::factory()->create([
        'status'             => 'Pending Activation',
        'pending_expires_at' => now()->addDays(5),
    ]);

    $this->artisan('provisioning:expire-stale')->assertExitCode(0);

    expect($stale->fresh()->status)->toBe('Expired');
    expect($fresh->fresh()->status)->toBe('Pending Activation');

    $this->assertDatabaseHas('audit_logs', [
        'action'         => AuditLog::ACTION_ADMIN_EXPIRED,
        'target_user_id' => $stale->user_id,
    ]);
});

test('does not touch an Activated user even if pending_expires_at is somehow set and past', function () {
    $activated = SystemUser::factory()->create([
        'status'             => 'Activated',
        'pending_expires_at' => now()->subDay(),
    ]);

    $this->artisan('provisioning:expire-stale')->assertExitCode(0);

    expect($activated->fresh()->status)->toBe('Activated');
});

test('expires an access request past its 7-day window', function () {
    $requester = SystemUser::factory()->create();

    $stale = AccessRequest::create([
        'requested_by'      => $requester->user_id,
        'target_email'      => 'stalerequest@example.com',
        'target_first_name' => 'Stale',
        'target_last_name'  => 'Request',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Never actioned.',
        'status'            => AccessRequest::STATUS_REQUESTED,
        'expires_at'        => now()->subDay(),
    ]);

    $fresh = AccessRequest::create([
        'requested_by'      => $requester->user_id,
        'target_email'      => 'freshrequest@example.com',
        'target_first_name' => 'Fresh',
        'target_last_name'  => 'Request',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Still within window.',
        'status'            => AccessRequest::STATUS_REQUESTED,
        'expires_at'        => now()->addDays(3),
    ]);

    $this->artisan('provisioning:expire-stale')->assertExitCode(0);

    expect($stale->fresh()->status)->toBe(AccessRequest::STATUS_EXPIRED);
    expect($fresh->fresh()->status)->toBe(AccessRequest::STATUS_REQUESTED);

    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ACCESS_REQUEST_EXPIRED]);
});

test('does not touch an already-Fulfilled or Rejected access request', function () {
    $requester = SystemUser::factory()->create();

    $fulfilled = AccessRequest::create([
        'requested_by'      => $requester->user_id,
        'target_email'      => 'fulfilled@example.com',
        'target_first_name' => 'F',
        'target_last_name'  => 'U',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'x',
        'status'            => AccessRequest::STATUS_FULFILLED,
        'expires_at'        => now()->subDay(), // stale timestamp but status already terminal
    ]);

    $this->artisan('provisioning:expire-stale')->assertExitCode(0);

    expect($fulfilled->fresh()->status)->toBe(AccessRequest::STATUS_FULFILLED);
});
