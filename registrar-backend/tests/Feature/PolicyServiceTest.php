<?php

use App\Models\Policy;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use App\Services\PolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function polActor(): SystemUser
{
    $actor = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($actor);
    return $actor;
}

function polRequest(): Request
{
    $request = Request::create('/api/system-users/1/policy', 'PATCH');
    $request->setUserResolver(fn () => auth()->user());
    return $request;
}

// ═════════════════════════════════════════════════════════════════════════════
// PolicyService::attachToUser() — keeps role_assignments.policy_id in sync
// (Gap #4 fix: assumedPolicyId() reads a role_assignments row's OWN
// policy_id when a session has switched into that role — see
// SystemUser::assumedPolicyId(). Leaving that row stale after a policy
// change silently kept enforcing the old policy for an already-switched
// session.)
// ═════════════════════════════════════════════════════════════════════════════

test('attachToUser() updates the raw policy_id and the matching Active role_assignments row together', function () {
    polActor();

    $oldPolicy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    $newPolicy = Policy::create(['name' => 'Records Staff', 'permissions' => ['dashboard' => ['Access'], 'inbox' => ['Access']]]);

    $admin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $oldPolicy->policy_id]);

    // The baseline role_assignments row every admin now gets (see
    // UserProvisioningService::ensureBaselineRoleAssignment()) — this is
    // what used to go stale.
    $baseline = RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $oldPolicy->policy_id,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    app(PolicyService::class)->attachToUser($admin, $newPolicy->policy_id, polRequest());

    expect($admin->fresh()->policy_id)->toBe($newPolicy->policy_id);
    expect($baseline->fresh()->policy_id)->toBe($newPolicy->policy_id);
});

test('attachToUser() detaching a policy (null) also clears the role_assignments row', function () {
    polActor();

    $policy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    $admin  = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $policy->policy_id]);

    $baseline = RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $policy->policy_id,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    app(PolicyService::class)->attachToUser($admin, null, polRequest());

    expect($admin->fresh()->policy_id)->toBeNull();
    expect($baseline->fresh()->policy_id)->toBeNull();
});

test('attachToUser() does not touch a Revoked or Expired role_assignments row', function () {
    polActor();

    $oldPolicy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    $newPolicy = Policy::create(['name' => 'Records Staff', 'permissions' => ['dashboard' => ['Access']]]);

    $admin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $oldPolicy->policy_id]);

    $revoked = RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $oldPolicy->policy_id,
        'status'     => RoleAssignment::STATUS_REVOKED,
        'granted_at' => now(),
        'revoked_at' => now(),
    ]);

    app(PolicyService::class)->attachToUser($admin, $newPolicy->policy_id, polRequest());

    // A dead row is history, not a live grant — it must keep recording
    // whatever policy was in effect at the time it was revoked.
    expect($revoked->fresh()->policy_id)->toBe($oldPolicy->policy_id);
});

test('attachToUser() does not touch another users role_assignments row', function () {
    polActor();

    $oldPolicy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    $newPolicy = Policy::create(['name' => 'Records Staff', 'permissions' => ['dashboard' => ['Access']]]);

    $admin       = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $oldPolicy->policy_id]);
    $otherAdmin  = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $oldPolicy->policy_id]);

    $otherBaseline = RoleAssignment::create([
        'user_id'    => $otherAdmin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $oldPolicy->policy_id,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    app(PolicyService::class)->attachToUser($admin, $newPolicy->policy_id, polRequest());

    expect($otherBaseline->fresh()->policy_id)->toBe($oldPolicy->policy_id);
});