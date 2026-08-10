<?php

use App\Models\RoleAssignment;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ═════════════════════════════════════════════════════════════════════════════
// POST /role-assignments/{roleAssignment}/revoke — self-target guard
// (Gap #3 fix: mirrors SystemUserController::destroy()'s "can't delete
// your own account" guard. Without it, a Super Admin revoking their own
// assignment force-deletes every one of their own active Sanctum tokens
// mid-request — logging themselves out with no confirmation.)
// ═════════════════════════════════════════════════════════════════════════════

test('a Super Admin cannot revoke their own role assignment', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);

    // A second Active row so this would otherwise be a legal revoke (not
    // blocked by the separate "only active role" guard) — isolates this
    // test to the self-target guard specifically.
    RoleAssignment::create([
        'user_id'    => $superAdmin->user_id,
        'role_id'    => SystemUser::ROLE_STUDENT,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    $ownAssignment = RoleAssignment::create([
        'user_id'    => $superAdmin->user_id,
        'role_id'    => SystemUser::ROLE_SUPER_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    Sanctum::actingAs($superAdmin);

    $this->postJson("/api/role-assignments/{$ownAssignment->id}/revoke", ['reason' => 'testing'])
        ->assertStatus(403)
        ->assertJson(['message' => 'You cannot revoke your own role assignment.']);

    expect($ownAssignment->fresh()->status)->toBe(RoleAssignment::STATUS_ACTIVE);
});

test('a Super Admin can revoke another users role assignment', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    $person     = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT]);

    RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_STUDENT,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    $adminAssignment = RoleAssignment::create([
        'user_id'    => $person->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    Sanctum::actingAs($superAdmin);

    $this->postJson("/api/role-assignments/{$adminAssignment->id}/revoke", ['reason' => 'testing'])
        ->assertOk();

    expect($adminAssignment->fresh()->status)->toBe(RoleAssignment::STATUS_REVOKED);
});
