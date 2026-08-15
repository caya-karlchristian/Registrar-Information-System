<?php

use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\Policy;
use App\Models\SystemUser;
use App\Services\AccessRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function arsActingAdmin(array $overrides = []): SystemUser
{
    $policy = Policy::create([
        'name'        => 'Access Request Submitters',
        'permissions' => ['access_requests' => ['Access']],
        'is_system'   => false,
    ]);

    $actor = SystemUser::factory()->create(array_merge([
        'role_id'   => SystemUser::ROLE_ADMIN,
        'status'    => 'Activated',
        'policy_id' => $policy->policy_id,
    ], $overrides));

    Sanctum::actingAs($actor);
    return $actor;
}

function arsActingSuperAdmin(): SystemUser
{
    $actor = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($actor);
    return $actor;
}

function arsRequest(): Request
{
    // Request::create() builds a bare request with no user resolver bound —
    // unlike the real request Laravel's HTTP kernel injects in production,
    // which has one attached by the auth middleware. Sanctum::actingAs()
    // authenticates the guard, but $request->user() on this object still
    // needs to be told to ask it explicitly.
    $request = Request::create('/api/access-requests', 'POST');
    $request->setUserResolver(fn () => auth()->user());
    return $request;
}

// ═════════════════════════════════════════════════════════════════════════════
// store()
// ═════════════════════════════════════════════════════════════════════════════

test('store() creates a Requested row expiring in 7 days', function () {
    $actor = arsActingAdmin();

    $service = app(AccessRequestService::class);
    $accessRequest = $service->store([
        'target_email'      => 'newperson@example.com',
        'target_first_name' => 'New',
        'target_last_name'  => 'Person',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needs access to help at the front desk.',
    ], arsRequest());

    expect($accessRequest->status)->toBe(AccessRequest::STATUS_REQUESTED);
    expect($accessRequest->requested_by)->toBe($actor->user_id);
    expect($accessRequest->expires_at->diffInDays(now()->addDays(7)))->toBeLessThan(1);

    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ACCESS_REQUEST_SUBMITTED]);
});

test('store() rejects a target email that already belongs to a SystemUser', function () {
    arsActingAdmin();
    $existing = SystemUser::factory()->create();

    $service = app(AccessRequestService::class);

    expect(fn () => $service->store([
        'target_email'      => $existing->email,
        'target_first_name' => 'New',
        'target_last_name'  => 'Person',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Duplicate.',
    ], arsRequest()))->toThrow(ValidationException::class);
});

test('store() persists an optional target middle name', function () {
    arsActingAdmin();

    $service = app(AccessRequestService::class);
    $accessRequest = $service->store([
        'target_email'       => 'withmiddle@example.com',
        'target_first_name'  => 'New',
        'target_middle_name' => 'Santos',
        'target_last_name'   => 'Person',
        'requested_role_id'  => SystemUser::ROLE_ADMIN,
        'justification'      => 'Needs access to help at the front desk.',
    ], arsRequest());

    expect($accessRequest->target_middle_name)->toBe('Santos');
});

test('store() leaves target middle name null when omitted', function () {
    arsActingAdmin();

    $service = app(AccessRequestService::class);
    $accessRequest = $service->store([
        'target_email'      => 'nomiddle@example.com',
        'target_first_name' => 'New',
        'target_last_name'  => 'Person',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needs access to help at the front desk.',
    ], arsRequest());

    expect($accessRequest->target_middle_name)->toBeNull();
});

test('store() persists an optional target suffix', function () {
    arsActingAdmin();

    $service = app(AccessRequestService::class);
    $accessRequest = $service->store([
        'target_email'      => 'withsuffix@example.com',
        'target_first_name' => 'New',
        'target_last_name'  => 'Person',
        'target_suffix'     => 'Jr.',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needs access to help at the front desk.',
    ], arsRequest());

    expect($accessRequest->target_suffix)->toBe('Jr.');
});

test('store() leaves target suffix null when omitted', function () {
    arsActingAdmin();

    $service = app(AccessRequestService::class);
    $accessRequest = $service->store([
        'target_email'      => 'nosuffix@example.com',
        'target_first_name' => 'New',
        'target_last_name'  => 'Person',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needs access to help at the front desk.',
    ], arsRequest());

    expect($accessRequest->target_suffix)->toBeNull();
});

// ═════════════════════════════════════════════════════════════════════════════
// approve()
// ═════════════════════════════════════════════════════════════════════════════

test('approve() carries the target middle name onto the created SystemUser profile', function () {
    $submitter = arsActingAdmin();
    $accessRequest = AccessRequest::create([
        'requested_by'       => $submitter->user_id,
        'target_email'       => 'approvedwithmiddle@example.com',
        'target_first_name'  => 'Approved',
        'target_middle_name' => 'Reyes',
        'target_last_name'   => 'Person',
        'requested_role_id'  => SystemUser::ROLE_ADMIN,
        'justification'      => 'Needed.',
        'status'             => AccessRequest::STATUS_REQUESTED,
        'expires_at'         => now()->addDays(7),
    ]);

    arsActingSuperAdmin();
    $service = app(AccessRequestService::class);
    $user    = $service->approve($accessRequest, arsRequest());

    $this->assertDatabaseHas('admin_profile', [
        'user_id'     => $user->user_id,
        'middle_name' => 'Reyes',
    ]);
});

test('approve() carries the target suffix onto the created SystemUser profile', function () {
    $submitter = arsActingAdmin();
    $accessRequest = AccessRequest::create([
        'requested_by'       => $submitter->user_id,
        'target_email'       => 'approvedwithsuffix@example.com',
        'target_first_name'  => 'Approved',
        'target_last_name'   => 'Person',
        'target_suffix'      => 'III',
        'requested_role_id'  => SystemUser::ROLE_ADMIN,
        'justification'      => 'Needed.',
        'status'             => AccessRequest::STATUS_REQUESTED,
        'expires_at'         => now()->addDays(7),
    ]);

    arsActingSuperAdmin();
    $service = app(AccessRequestService::class);
    $user    = $service->approve($accessRequest, arsRequest());

    $this->assertDatabaseHas('admin_profile', [
        'user_id' => $user->user_id,
        'suffix'  => 'III',
    ]);
});

test('approve() creates a Pending Activation SystemUser and marks the request Fulfilled', function () {
    $submitter = arsActingAdmin();
    $accessRequest = AccessRequest::create([
        'requested_by'      => $submitter->user_id,
        'target_email'      => 'approved@example.com',
        'target_first_name' => 'Approved',
        'target_last_name'  => 'Person',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needed.',
        'status'            => AccessRequest::STATUS_REQUESTED,
        'expires_at'        => now()->addDays(7),
    ]);

    $reviewer = arsActingSuperAdmin();
    $service  = app(AccessRequestService::class);
    $user     = $service->approve($accessRequest, arsRequest());

    expect($user->status)->toBe('Pending Activation');
    expect($user->idp_user_id)->toBeNull();
    expect($user->password)->toBeNull();

    $accessRequest->refresh();
    expect($accessRequest->status)->toBe(AccessRequest::STATUS_FULFILLED);
    expect($accessRequest->fulfilled_user_id)->toBe($user->user_id);
    expect($accessRequest->reviewed_by)->toBe($reviewer->user_id);
    expect($accessRequest->expires_at)->toBeNull();

    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ACCESS_REQUEST_APPROVED]);
});

test('approve() fails for a request that is not in Requested status', function () {
    $submitter = arsActingAdmin();
    $accessRequest = AccessRequest::create([
        'requested_by'      => $submitter->user_id,
        'target_email'      => 'alreadyfulfilled@example.com',
        'target_first_name' => 'X',
        'target_last_name'  => 'Y',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needed.',
        'status'            => AccessRequest::STATUS_FULFILLED,
        'expires_at'        => null,
    ]);

    arsActingSuperAdmin();
    $service = app(AccessRequestService::class);

    expect(fn () => $service->approve($accessRequest, arsRequest()))->toThrow(ValidationException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// reject()
// ═════════════════════════════════════════════════════════════════════════════

test('reject() stores the reason and marks the request Rejected without creating a SystemUser', function () {
    $submitter = arsActingAdmin();
    $accessRequest = AccessRequest::create([
        'requested_by'      => $submitter->user_id,
        'target_email'      => 'rejected@example.com',
        'target_first_name' => 'Rej',
        'target_last_name'  => 'Ected',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needed.',
        'status'            => AccessRequest::STATUS_REQUESTED,
        'expires_at'        => now()->addDays(7),
    ]);

    arsActingSuperAdmin();
    $service = app(AccessRequestService::class);
    $service->reject($accessRequest, 'Not enough justification provided.', arsRequest());

    $accessRequest->refresh();
    expect($accessRequest->status)->toBe(AccessRequest::STATUS_REJECTED);
    expect($accessRequest->rejection_reason)->toBe('Not enough justification provided.');

    $this->assertDatabaseMissing('users', ['email' => 'rejected@example.com']);
    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ACCESS_REQUEST_REJECTED]);
});

// ═════════════════════════════════════════════════════════════════════════════
// Authorization — a non-super-admin can never approve/reject, only submit
// ═════════════════════════════════════════════════════════════════════════════

test('a regular admin with the access_requests module can submit but cannot approve', function () {
    arsActingAdmin();

    $this->postJson('/api/access-requests', [
        'target_email'      => 'viaapi@example.com',
        'target_first_name' => 'Via',
        'target_last_name'  => 'Api',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Needed for front desk coverage.',
    ])->assertCreated();

    $accessRequest = AccessRequest::where('target_email', 'viaapi@example.com')->firstOrFail();

    $this->postJson("/api/access-requests/{$accessRequest->id}/approve")
        ->assertStatus(403);
});

test('an admin without the access_requests module cannot submit a request', function () {
    SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'status' => 'Activated', 'policy_id' => null]);
    $actor = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'status' => 'Activated', 'policy_id' => null]);
    Sanctum::actingAs($actor);

    $this->postJson('/api/access-requests', [
        'target_email'      => 'blocked@example.com',
        'target_first_name' => 'Blocked',
        'target_last_name'  => 'Admin',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Should be blocked.',
    ])->assertStatus(403);
});