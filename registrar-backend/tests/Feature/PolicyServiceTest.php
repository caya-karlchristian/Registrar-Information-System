<?php

use App\Exceptions\PolicyException;
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
// PolicyService::attachToUser() was retired in Work Item #2 — Admin
// Management Consolidation. The "keeps role_assignments.policy_id in sync"
// coverage that used to live here now lives in
// RoleAssignmentTest.php ("editPolicy()" section), which tests the
// direct replacement: RoleAssignmentService::editPolicy(). See that file
// for the equivalent baseline-row-sync, detach, Revoked/Expired-row, and
// other-user-isolation coverage.
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// PolicyService::delete() — refuses to delete a policy that is in use
// (QA fix: a policy could previously be deleted while still assigned to an
// admin, silently detaching them instead of blocking the delete.)
// ═════════════════════════════════════════════════════════════════════════════

test('delete() throws and does not delete the policy when it is an admin\'s primary policy', function () {
    polActor();

    $policy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $policy->policy_id]);

    expect(fn () => app(PolicyService::class)->delete($policy, polRequest()))
        ->toThrow(PolicyException::class);

    expect(Policy::find($policy->policy_id))->not->toBeNull();
});

test('delete() throws when the policy has an Active role_assignments grant, even with no primary holder', function () {
    polActor();

    $policy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    // Primary policy_id is something else — only the role_assignments row
    // references this policy, e.g. a student-staff account previewing as
    // Admin with this policy assumed for that session.
    $otherPolicy = Policy::create(['name' => 'Records Staff', 'permissions' => ['inbox' => ['Access']]]);
    $admin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => $otherPolicy->policy_id]);

    RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $policy->policy_id,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    expect(fn () => app(PolicyService::class)->delete($policy, polRequest()))
        ->toThrow(PolicyException::class);

    expect(Policy::find($policy->policy_id))->not->toBeNull();
});

test('delete() ignores Revoked/Expired role_assignments rows and succeeds', function () {
    polActor();

    $policy = Policy::create(['name' => 'Front Desk', 'permissions' => ['dashboard' => ['Access']]]);
    $admin  = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'policy_id' => null]);

    RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $policy->policy_id,
        'status'     => RoleAssignment::STATUS_REVOKED,
        'granted_at' => now(),
        'revoked_at' => now(),
    ]);

    app(PolicyService::class)->delete($policy, polRequest());

    expect(Policy::find($policy->policy_id))->toBeNull();
});

test('delete() succeeds for an unassigned custom policy', function () {
    polActor();

    $policy = Policy::create(['name' => 'Unused Policy', 'permissions' => []]);

    app(PolicyService::class)->delete($policy, polRequest());

    expect(Policy::find($policy->policy_id))->toBeNull();
});

test('delete() still refuses a system-managed policy before checking usage', function () {
    polActor();

    // 'No Access' (Policy::DEFAULT_NAME) is already seeded as a real
    // is_system row by the policies migration, and `name` is unique —
    // use a different name so this test doesn't collide with it.
    $policy = Policy::create(['name' => 'Test System Policy', 'permissions' => [], 'is_system' => true]);

    expect(fn () => app(PolicyService::class)->delete($policy, polRequest()))
        ->toThrow(PolicyException::class, 'System-managed policies cannot be deleted.');

    expect(Policy::find($policy->policy_id))->not->toBeNull();
});