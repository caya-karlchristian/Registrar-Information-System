<?php

use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ═════════════════════════════════════════════════════════════════════════════
// `php artisan break-glass:test` — TestBreakGlassAccess
// ═════════════════════════════════════════════════════════════════════════════

test('break-glass:test exits successfully when there are no break-glass accounts', function () {
    SystemUser::factory()->create(['local_auth_enabled' => 0]);

    $this->artisan('break-glass:test')->assertExitCode(0);
});

test('break-glass:test exits successfully when all break-glass accounts are correctly configured', function () {
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
        'status'              => 'Activated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);

    $this->artisan('break-glass:test')->assertExitCode(0);
});

test('break-glass:test fails when a break-glass account is deactivated', function () {
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
        'status'              => 'Deactivated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);

    $this->artisan('break-glass:test')->assertExitCode(1);
});

test('break-glass:test fails when a break-glass account is not a super admin', function () {
    // Represents configuration drift — e.g. flipped on directly in the DB —
    // since the API path (SetLocalPasswordRequest) no longer allows this.
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_ADMIN,
        'status'              => 'Activated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);

    $this->artisan('break-glass:test')->assertExitCode(1);
});

test('break-glass:test fails when a break-glass account has no password hash', function () {
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
        'status'              => 'Activated',
        'password'            => '',
        'local_auth_enabled'  => 1,
    ]);

    $this->artisan('break-glass:test')->assertExitCode(1);
});

test('break-glass:test reports every failing account, not just the first', function () {
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
        'status'              => 'Deactivated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_ADMIN,
        'status'              => 'Activated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);
    // One correctly configured account should not mask the two failures above.
    SystemUser::factory()->create([
        'role_id'             => SystemUser::ROLE_SUPER_ADMIN,
        'status'              => 'Activated',
        'password'            => bcrypt('CorrectPass1'),
        'local_auth_enabled'  => 1,
    ]);

    $this->artisan('break-glass:test')
        ->expectsOutputToContain('2 break-glass account(s) failed')
        ->assertExitCode(1);
});