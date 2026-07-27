<?php

use App\Exceptions\IdpException;
use App\Exceptions\IdpUnavailableException;
use App\Models\SystemUser;
use App\Services\Sso\SsoAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ── Helpers ───────────────────────────────────────────────────────────────────

function authMakeLocalUser(array $overrides = []): SystemUser
{
    return SystemUser::factory()->create(array_merge([
        'role_id'             => SystemUser::ROLE_ADMIN,
        'status'              => 'Activated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ], $overrides));
}

// ═════════════════════════════════════════════════════════════════════════════
// LoginRequest — shared validation, exercised through both /login and
// /auth/local-login since it's the same FormRequest class either way.
// ═════════════════════════════════════════════════════════════════════════════

test('login fails validation when email or password is missing', function () {
    $this->postJson('/api/login', ['email' => 'not-an-email'])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['email', 'password']);
});

test('local-login fails validation the same way as /login', function () {
    $this->postJson('/api/auth/local-login', ['email' => 'not-an-email'])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['email', 'password']);
});

// ═════════════════════════════════════════════════════════════════════════════
// AuthController::login() — IDP-first with local fallback
// ═════════════════════════════════════════════════════════════════════════════

test('login succeeds via the IdP and sets X-Auth-Method: idp', function () {
    $user = authMakeLocalUser();

    $this->mock(SsoAuthService::class, function ($mock) use ($user) {
        $mock->shouldReceive('loginWithCredentials')
             ->once()
             ->andReturn(['user' => $user, 'token' => 'idp-token']);
    });

    $this->postJson('/api/login', [
        'email'    => $user->email,
        'password' => 'whatever-the-idp-accepted',
    ])->assertOk()
      ->assertHeader('X-Auth-Method', 'idp')
      ->assertJsonPath('user.user_id', $user->user_id);
});

test('login rejects immediately when the IdP rejects credentials (no local fallback)', function () {
    $user = authMakeLocalUser();

    $this->mock(SsoAuthService::class, function ($mock) {
        $mock->shouldReceive('loginWithCredentials')
             ->once()
             ->andThrow(new IdpException('Invalid credentials.', 401));
    });

    $this->postJson('/api/login', [
        'email'    => $user->email,
        'password' => 'wrong-password',
    ])->assertStatus(401)
      ->assertJson(['message' => 'Invalid credentials.']);
});

test('login falls back to local auth when the IdP is unreachable', function () {
    $user = authMakeLocalUser();

    $this->mock(SsoAuthService::class, function ($mock) {
        $mock->shouldReceive('loginWithCredentials')
             ->once()
             ->andThrow(new IdpUnavailableException('Connection refused', 0));
    });

    $this->postJson('/api/login', [
        'email'    => $user->email,
        'password' => 'CorrectPass1',
    ])->assertOk()
      ->assertHeader('X-Auth-Method', 'local')
      ->assertJsonPath('idp_offline', true)
      ->assertJsonPath('user.user_id', $user->user_id);
});

test('login fallback fails with idp_offline flag when local credentials are also wrong', function () {
    $user = authMakeLocalUser();

    $this->mock(SsoAuthService::class, function ($mock) {
        $mock->shouldReceive('loginWithCredentials')
             ->once()
             ->andThrow(new IdpUnavailableException('Connection refused', 0));
    });

    $this->postJson('/api/login', [
        'email'    => $user->email,
        'password' => 'WrongPassword1',
    ])->assertStatus(401)
      ->assertJsonPath('idp_offline', true);
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/me — unaffected by the FormRequest conversion, kept as a smoke test
// ═════════════════════════════════════════════════════════════════════════════

test('unauthenticated /me returns 401', function () {
    $this->getJson('/api/me')->assertStatus(401);
});

// ═════════════════════════════════════════════════════════════════════════════
// LocalAuthController::login() — always-local, no IdP involved
// ═════════════════════════════════════════════════════════════════════════════

test('local-login succeeds with correct credentials for a local-auth-enabled user', function () {
    $user = authMakeLocalUser();

    $this->postJson('/api/auth/local-login', [
        'email'    => $user->email,
        'password' => 'CorrectPass1',
    ])->assertOk()
      ->assertJsonPath('user.user_id', $user->user_id);
});

test('local-login is rejected for a user without local auth enabled', function () {
    $user = authMakeLocalUser(['local_auth_enabled' => 0]);

    $this->postJson('/api/auth/local-login', [
        'email'    => $user->email,
        'password' => 'CorrectPass1',
    ])->assertStatus(403);
});

test('local-login is rejected with the wrong password', function () {
    $user = authMakeLocalUser();

    $this->postJson('/api/auth/local-login', [
        'email'    => $user->email,
        'password' => 'WrongPassword1',
    ])->assertStatus(401);
});

test('local-login is rejected for a deactivated account', function () {
    $user = authMakeLocalUser(['status' => 'Deactivated']);

    $this->postJson('/api/auth/local-login', [
        'email'    => $user->email,
        'password' => 'CorrectPass1',
    ])->assertStatus(403);
});

// ═════════════════════════════════════════════════════════════════════════════
// LocalAuthController::setPassword() — SetLocalPasswordRequest (superadmin only)
// ═════════════════════════════════════════════════════════════════════════════

test('non-superadmin cannot set a local password', function () {
    $admin  = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($admin);
    $target = SystemUser::factory()->create();

    $this->postJson('/api/auth/local-password', [
        'user_id'               => $target->user_id,
        'password'              => 'NewPassword1',
        'password_confirmation' => 'NewPassword1',
    ])->assertStatus(403);
});

test('setPassword fails validation when confirmation does not match', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($superAdmin);
    $target = SystemUser::factory()->create();

    $this->postJson('/api/auth/local-password', [
        'user_id'               => $target->user_id,
        'password'              => 'NewPassword1',
        'password_confirmation' => 'Mismatch1',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['password']);
});

test('setPassword fails validation for a nonexistent user_id', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($superAdmin);

    $this->postJson('/api/auth/local-password', [
        'user_id'               => 999999,
        'password'              => 'NewPassword1',
        'password_confirmation' => 'NewPassword1',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['user_id']);
});

test('superadmin can set a local password, enabling local auth for the target', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN, 'status' => 'Activated']);
    Sanctum::actingAs($superAdmin);
    $target = SystemUser::factory()->create(['local_auth_enabled' => 0]);

    $this->postJson('/api/auth/local-password', [
        'user_id'               => $target->user_id,
        'password'              => 'NewPassword1',
        'password_confirmation' => 'NewPassword1',
    ])->assertOk()
      ->assertJsonPath('user_id', $target->user_id);

    $this->assertDatabaseHas('users', ['user_id' => $target->user_id, 'local_auth_enabled' => 1]);

    // The target can now actually log in locally with the new password.
    $this->postJson('/api/auth/local-login', [
        'email'    => $target->email,
        'password' => 'NewPassword1',
    ])->assertOk();
});
