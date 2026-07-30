<?php

use App\Models\AuditLog;
use App\Models\Policy;
use App\Models\SystemUser;
use App\Services\Sso\IdpClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ── Helpers ───────────────────────────────────────────────────────────────────

function suMakeUser(int $roleId): SystemUser
{
    $user = SystemUser::factory()->create(['role_id' => $roleId, 'status' => 'Activated']);
    Sanctum::actingAs($user);
    return $user;
}

/**
 * SystemUserFactory doesn't set idp_user_id, so it defaults to null on any
 * user it creates — meaning AdminUserService::update()/delete() skip their
 * IdP branches entirely for these targets. That lets most tests below avoid
 * mocking IdpClient; only store() unconditionally calls IdpClient::createUser
 * regardless of target state, so that one needs a mock.
 */
function suMakeTarget(int $roleId): SystemUser
{
    return SystemUser::factory()->create(['role_id' => $roleId, 'status' => 'Activated']);
}

function suMakePolicy(array $overrides = []): Policy
{
    return Policy::create(array_merge([
        'name'        => 'Front Desk',
        'permissions' => ['dashboard' => ['Access'], 'inbox' => [], 'analytics' => [], 'logbook' => [], 'profile' => []],
        'is_system'   => false,
    ], $overrides));
}

// ═════════════════════════════════════════════════════════════════════════════
// index() — role:4 middleware + SystemUserPolicy::viewAny (both superadmin-only)
// ═════════════════════════════════════════════════════════════════════════════

test('admin (role 3) is blocked from system-users by route middleware', function () {
    suMakeUser(SystemUser::ROLE_ADMIN);

    // Blocked at role:4 middleware, before the controller/Policy ever run —
    // hence Laravel's raw 'Forbidden' from RoleMiddleware, not the Policy's
    // default authorization message.
    $this->getJson('/api/system-users')
         ->assertStatus(403)
         ->assertJson(['message' => 'Forbidden']);
});

test('superadmin can list system users, scoped to admin/super-admin roles only', function () {
    suMakeTarget(SystemUser::ROLE_STUDENT);
    suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $response = $this->getJson('/api/system-users')->assertOk();

    $emails = collect($response->json('data'))->pluck('role_id');
    expect($emails->every(fn ($r) => in_array($r, [SystemUser::ROLE_ADMIN, SystemUser::ROLE_SUPER_ADMIN])))->toBeTrue();
});

// ═════════════════════════════════════════════════════════════════════════════
// show() — SystemUserPolicy::view: target must also be role 3/4
// ═════════════════════════════════════════════════════════════════════════════

test('show returns 404 for a missing user', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->getJson('/api/system-users/999')->assertStatus(404);
});

test('show is forbidden when the target is not an admin/super-admin account', function () {
    $student = suMakeTarget(SystemUser::ROLE_STUDENT);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    // Policy::view() returns false for non-manageable targets — this is a
    // genuine authorize() failure (not the route middleware), so it's
    // Laravel's default message rather than 'Forbidden'.
    $this->getJson("/api/system-users/{$student->user_id}")
         ->assertStatus(403)
         ->assertJson(['message' => 'This action is unauthorized.']);
});

test('superadmin can view an admin account', function () {
    $admin = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->getJson("/api/system-users/{$admin->user_id}")
         ->assertOk()
         ->assertJsonPath('data.user_id', $admin->user_id)
         ->assertJsonPath('data.role_name', 'admin');
});

// ═════════════════════════════════════════════════════════════════════════════
// store() — StoreSystemUserRequest validation + SystemUserPolicy::create
// ═════════════════════════════════════════════════════════════════════════════

test('store fails validation on weak password and bad role_id', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->postJson('/api/system-users', [
        'email'      => 'newadmin@example.com',
        'password'   => 'weak',      // fails Password::min(8)->mixedCase()->numbers()
        'role_id'    => 1,           // not in:3,4
        'first_name' => 'New',
        'last_name'  => 'Admin',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['password', 'role_id']);
});

test('store fails validation when email is already taken', function () {
    $existing = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->postJson('/api/system-users', [
        'email'      => $existing->email,
        'password'   => 'Password123',
        'role_id'    => 3,
        'first_name' => 'New',
        'last_name'  => 'Admin',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['email']);
});

test('superadmin can create a new admin account', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->mock(IdpClient::class, function ($mock) {
        $mock->shouldReceive('createUser')->once()->andReturn('idp-user-123');
    });

    $this->postJson('/api/system-users', [
        'email'      => 'newadmin@example.com',
        'password'   => 'Password123',
        'role_id'    => 3,
        'first_name' => 'New',
        'last_name'  => 'Admin',
    ])->assertCreated()
      ->assertJsonPath('data.email', 'newadmin@example.com')
      ->assertJsonPath('data.role_name', 'admin');

    $this->assertDatabaseHas('users', [
        'email'       => 'newadmin@example.com',
        'idp_user_id' => 'idp-user-123',
    ]);
    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ADMIN_CREATED]);
});

test('policy_id is silently ignored when creating a super-admin account', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);
    $policy = suMakePolicy();

    $this->mock(IdpClient::class, function ($mock) {
        $mock->shouldReceive('createUser')->once()->andReturn('idp-user-456');
    });

    $response = $this->postJson('/api/system-users', [
        'email'      => 'newsuperadmin@example.com',
        'password'   => 'Password123',
        'role_id'    => 4,
        'first_name' => 'New',
        'last_name'  => 'SuperAdmin',
        'policy_id'  => $policy->policy_id,
    ])->assertCreated();

    // AdminUserService::create() only honors policy_id when role_id === ROLE_ADMIN
    expect($response->json('data.policy_id'))->toBeNull();
});

test('creating a new admin or super-admin never enables break-glass (local) auth', function () {
    // Regression test: AdminUserService::create() previously set
    // local_auth_enabled = 1 (and a real, guessable-by-anyone-who-saw-the-
    // password local hash) for every new admin/super-admin, making
    // break-glass access an option on every admin rather than a small,
    // deliberately-chosen set of Super Admin accounts. It must now stay
    // off regardless of what's submitted, for both roles.
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->mock(IdpClient::class, function ($mock) {
        $mock->shouldReceive('createUser')->twice()->andReturn('idp-user-789', 'idp-user-790');
    });

    $this->postJson('/api/system-users', [
        'email'      => 'newadmin2@example.com',
        'password'   => 'Password123',
        'role_id'    => 3,
        'first_name' => 'New',
        'last_name'  => 'Admin',
    ])->assertCreated();

    $this->postJson('/api/system-users', [
        'email'      => 'newsuperadmin2@example.com',
        'password'   => 'Password123',
        'role_id'    => 4,
        'first_name' => 'New',
        'last_name'  => 'SuperAdmin',
    ])->assertCreated();

    $this->assertDatabaseHas('users', ['email' => 'newadmin2@example.com', 'local_auth_enabled' => 0]);
    $this->assertDatabaseHas('users', ['email' => 'newsuperadmin2@example.com', 'local_auth_enabled' => 0]);

    // The stored password hash must not authenticate with the account's
    // real (IdP) password — it exists only to satisfy the NOT NULL schema
    // constraint and must never be a usable local credential.
    $created = SystemUser::where('email', 'newadmin2@example.com')->firstOrFail();
    expect(\Illuminate\Support\Facades\Hash::check('Password123', $created->password))->toBeFalse();
});

test('store returns 500 and does not create a local user when the IdP call fails', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->mock(IdpClient::class, function ($mock) {
        $mock->shouldReceive('createUser')->once()->andThrow(new \App\Exceptions\IdpException('IdP is down', 502));
    });

    $this->postJson('/api/system-users', [
        'email'      => 'failed@example.com',
        'password'   => 'Password123',
        'role_id'    => 3,
        'first_name' => 'Will',
        'last_name'  => 'Fail',
    ])->assertStatus(500);

    $this->assertDatabaseMissing('users', ['email' => 'failed@example.com']);
});

// ═════════════════════════════════════════════════════════════════════════════
// update() — UpdateSystemUserRequest validation + SystemUserPolicy::update
// ═════════════════════════════════════════════════════════════════════════════

test('update returns 404 for a missing user', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson('/api/system-users/999', ['first_name' => 'X'])
         ->assertStatus(404);
});

test('update is forbidden when the target is not an admin/super-admin account', function () {
    $student = suMakeTarget(SystemUser::ROLE_STUDENT);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson("/api/system-users/{$student->user_id}", ['first_name' => 'X'])
         ->assertStatus(403);
});

test('update fails validation when email is already taken by someone else', function () {
    $other  = suMakeTarget(SystemUser::ROLE_ADMIN);
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson("/api/system-users/{$target->user_id}", ['email' => $other->email])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['email']);
});

test('update allows keeping the same email for the same user (unique rule excludes self)', function () {
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson("/api/system-users/{$target->user_id}", [
        'email'      => $target->email,
        'first_name' => 'Updated',
    ])->assertOk()
      ->assertJsonPath('data.first_name', 'Updated');
});

test('superadmin can update an admin account status without touching the IdP', function () {
    // idp_user_id is null on factory-made users, so AdminUserService::update()
    // must skip its IdP branch entirely here — no IdpClient mock needed,
    // and if the code tried to call it, this would error on the real client.
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson("/api/system-users/{$target->user_id}", [
        'status' => 'Deactivated',
    ])->assertOk()
      ->assertJsonPath('data.status', 'Deactivated');

    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ADMIN_UPDATED]);
});

test('update fails validation on an invalid status value', function () {
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->putJson("/api/system-users/{$target->user_id}", ['status' => 'Suspended'])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['status']);
});

// ═════════════════════════════════════════════════════════════════════════════
// attachPolicy() — AttachSystemUserPolicyRequest + SystemUserPolicy::attachPolicy
// ═════════════════════════════════════════════════════════════════════════════

test('attachPolicy fails validation for a nonexistent policy_id', function () {
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->patchJson("/api/system-users/{$target->user_id}/policy", ['policy_id' => 999])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['policy_id']);
});

test('superadmin can attach a policy to an admin account', function () {
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    $policy = suMakePolicy();
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->patchJson("/api/system-users/{$target->user_id}/policy", ['policy_id' => $policy->policy_id])
         ->assertOk()
         ->assertJsonPath('data.policy_id', $policy->policy_id);
});

test('attaching a policy to a super-admin target is rejected with a PolicyException message', function () {
    $target = suMakeTarget(SystemUser::ROLE_SUPER_ADMIN);
    $policy = suMakePolicy();
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    // Policy target-role check (attachPolicy ability) passes since role 4 is
    // "manageable" for policy purposes, but PolicyService::attachToUser()
    // itself rejects non-admin targets — so this 422 comes from the service,
    // not the FormRequest.
    $this->patchJson("/api/system-users/{$target->user_id}/policy", ['policy_id' => $policy->policy_id])
         ->assertStatus(422)
         ->assertJsonPath('message', 'Policies can only be attached to admin accounts. Super admins have full access by default.');
});

test('sending policy_id null detaches the current policy', function () {
    $policy = suMakePolicy();
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    $target->update(['policy_id' => $policy->policy_id]);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->patchJson("/api/system-users/{$target->user_id}/policy", ['policy_id' => null])
         ->assertOk()
         ->assertJsonPath('data.policy_id', null);
});

// ═════════════════════════════════════════════════════════════════════════════
// destroy() — self-delete guard (controller) + SystemUserPolicy::delete
// ═════════════════════════════════════════════════════════════════════════════

test('destroy returns 404 for a missing user', function () {
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->deleteJson('/api/system-users/999')->assertStatus(404);
});

test('superadmin cannot delete their own account', function () {
    $self = suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->deleteJson("/api/system-users/{$self->user_id}")
         ->assertStatus(403)
         ->assertJson(['message' => 'You cannot delete your own account.']);

    $this->assertDatabaseHas('users', ['user_id' => $self->user_id]);
});

test('superadmin can delete another admin account', function () {
    $target = suMakeTarget(SystemUser::ROLE_ADMIN);
    suMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->deleteJson("/api/system-users/{$target->user_id}")
         ->assertOk()
         ->assertJson(['message' => 'User deleted successfully']);

    $this->assertDatabaseMissing('users', ['user_id' => $target->user_id]);
    $this->assertDatabaseHas('audit_logs', ['action' => AuditLog::ACTION_ADMIN_DELETED]);
});

// NOTE: destroy()'s 409 "still has associated requests/records/history" branch
// (QueryException 23000) relies on the DB enforcing a foreign key back to
// `users`. Same SQLite limitation noted in CertificationTypeControllerTest —
// not exercised here, needs a MySQL-backed run.