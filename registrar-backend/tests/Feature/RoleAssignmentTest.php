<?php

use App\Models\AuditLog;
use App\Models\Policy;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use App\Services\RoleAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

// Locally-scoped helper name (not a generic "actingRequest") to avoid any
// risk of colliding with a same-named helper introduced later in another
// Feature test file — Pest loads all Feature/*.php into one process.
function roleAssignmentTestRequest(SystemUser $actor): Request
{
    $request = Request::create('/test', 'POST');
    $request->setUserResolver(fn () => $actor);
    return $request;
}

// ═════════════════════════════════════════════════════════════════════════════
// RoleAssignmentService::grant()
// ═════════════════════════════════════════════════════════════════════════════

test('grants a second, concurrent role to a user who already holds one', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    $student    = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT]);
    $policy     = Policy::create(['name' => 'Dashboard + Inbox Only', 'permissions' => ['dashboard' => ['Access'], 'inbox' => ['Access']]]);

    $service = app(RoleAssignmentService::class);

    $assignment = $service->grant([
        'user_id'    => $student->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'policy_id'  => $policy->policy_id,
        'expires_at' => now()->addMonths(4),
    ], roleAssignmentTestRequest($superAdmin));

    expect($assignment->status)->toBe(RoleAssignment::STATUS_ACTIVE);
    expect($student->activeRoleAssignments()->pluck('role_id')->all())
        ->toContain(SystemUser::ROLE_ADMIN);

    $this->assertDatabaseHas('audit_logs', [
        'action'         => AuditLog::ACTION_ROLE_ASSIGNED,
        'target_user_id' => $student->user_id,
    ]);
});

test('rejects granting a role the user already actively holds', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    $admin      = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN]);

    RoleAssignment::create([
        'user_id' => $admin->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    $service = app(RoleAssignmentService::class);

    expect(fn () => $service->grant([
        'user_id' => $admin->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
    ], roleAssignmentTestRequest($superAdmin)))->toThrow(ValidationException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// RoleAssignmentService::revoke()  — explicit "they left" offboarding
// ═════════════════════════════════════════════════════════════════════════════

test('revoking one role assignment does not touch the users other active assignments', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    $person     = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT]);

    $studentAssignment = RoleAssignment::create([
        'user_id' => $person->user_id,
        'role_id' => SystemUser::ROLE_STUDENT,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    $adminAssignment = RoleAssignment::create([
        'user_id' => $person->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    $service = app(RoleAssignmentService::class);
    $service->revoke($adminAssignment, 'No longer working the front desk.', roleAssignmentTestRequest($superAdmin));

    expect($adminAssignment->fresh()->status)->toBe(RoleAssignment::STATUS_REVOKED);
    expect($studentAssignment->fresh()->status)->toBe(RoleAssignment::STATUS_ACTIVE);

    $this->assertDatabaseHas('audit_logs', [
        'action'         => AuditLog::ACTION_ROLE_REVOKED,
        'target_user_id' => $person->user_id,
    ]);
});

test('revoking a role assignment invalidates the users existing sessions', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    $person     = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN]);

    $person->createToken('sanctum-idp');
    expect($person->tokens()->count())->toBe(1);

    $adminAssignment = RoleAssignment::create([
        'user_id' => $person->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    app(RoleAssignmentService::class)->revoke($adminAssignment, 'Left the office.', roleAssignmentTestRequest($superAdmin));

    expect($person->tokens()->count())->toBe(0);
});

test('rejects revoking an assignment that is already revoked', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    $person     = SystemUser::factory()->create();

    $assignment = RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_REVOKED,
        'revoked_at' => now(),
    ]);

    $service = app(RoleAssignmentService::class);

    expect(fn () => $service->revoke($assignment, 'again', roleAssignmentTestRequest($superAdmin)))
        ->toThrow(ValidationException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan role-assignments:expire` — automatic offboarding
// (the "graduated / grant not renewed" path — see command docblock for
// why this is time-boxed rather than event-driven)
// ═════════════════════════════════════════════════════════════════════════════

test('expires a role assignment past its expires_at and revokes tokens', function () {
    $person = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT]);
    $person->createToken('sanctum-idp');

    $expiredAssignment = RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'expires_at' => now()->subDay(),
    ]);

    $stillGood = RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_STUDENT,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'expires_at' => null,
    ]);

    $this->artisan('role-assignments:expire')->assertExitCode(0);

    expect($expiredAssignment->fresh()->status)->toBe(RoleAssignment::STATUS_EXPIRED);
    expect($stillGood->fresh()->status)->toBe(RoleAssignment::STATUS_ACTIVE);
    expect($person->tokens()->count())->toBe(0);

    $this->assertDatabaseHas('audit_logs', [
        'action'             => AuditLog::ACTION_ROLE_EXPIRED,
        'target_user_id'     => $person->user_id,
    ]);
});

test('does not touch an assignment with no expires_at (indefinite)', function () {
    $person = SystemUser::factory()->create();

    $indefinite = RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'expires_at' => null,
    ]);

    $this->artisan('role-assignments:expire')->assertExitCode(0);

    expect($indefinite->fresh()->status)->toBe(RoleAssignment::STATUS_ACTIVE);
});
