<?php

use App\Exceptions\UnregisteredAccountException;
use App\Models\AuditLog;
use App\Models\SystemUser;
use App\Services\Sso\UserProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

function upsRequest(): Request
{
    return Request::create('/api/auth/callback', 'POST');
}

// ═════════════════════════════════════════════════════════════════════════════
// Activation backfill: Pending Activation admin/super-admin -> Activated
// ═════════════════════════════════════════════════════════════════════════════

test('first SSO login activates a Pending Activation admin and backfills idp_user_id', function () {
    $pending = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Pending Activation',
        'idp_user_id' => null,
        'password'    => null,
        'pending_expires_at' => now()->addDays(14),
    ]);

    $service = app(UserProvisioningService::class);
    $result  = $service->provision([
        'id'    => 'idp-user-abc',
        'email' => $pending->email,
    ], upsRequest());

    $pending->refresh();
    expect($pending->status)->toBe('Activated');
    expect($pending->idp_user_id)->toBe('idp-user-abc');
    expect($pending->pending_expires_at)->toBeNull();
    expect($result->user->user_id)->toBe($pending->user_id);
});

test('activation writes an ACTION_ADMIN_ACTIVATED audit log attributed to the activating user', function () {
    $pending = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_SUPER_ADMIN,
        'status'      => 'Pending Activation',
        'idp_user_id' => null,
        'password'    => null,
        'pending_expires_at' => now()->addDays(14),
    ]);

    app(UserProvisioningService::class)->provision([
        'id'    => 'idp-user-xyz',
        'email' => $pending->email,
    ], upsRequest());

    $this->assertDatabaseHas('audit_logs', [
        'action'         => AuditLog::ACTION_ADMIN_ACTIVATED,
        'target_user_id' => $pending->user_id,
        'user_id'        => $pending->user_id,
    ]);
});

test('an already-Activated admin logging in again does not re-trigger activation logic', function () {
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'already-linked',
    ]);

    app(UserProvisioningService::class)->provision([
        'id'    => 'a-different-idp-id',
        'email' => $admin->email,
    ], upsRequest());

    $admin->refresh();
    // idp_user_id must NOT be overwritten by a later login's value — the
    // activation backfill only ever fires from Pending Activation.
    expect($admin->idp_user_id)->toBe('already-linked');
    expect(AuditLog::where('action', AuditLog::ACTION_ADMIN_ACTIVATED)->count())->toBe(0);
});

// ═════════════════════════════════════════════════════════════════════════════
// Deny-by-default: no RIS record + System Administrator IdP account type
// ═════════════════════════════════════════════════════════════════════════════

test('a System Administrator IdP login with no matching RIS record is denied', function () {
    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'               => 'unregistered-idp-id',
        'email'            => 'unregistered@example.com',
        'account_type_id'  => 1, // "System Administrator" per IdpClient::createUser docblock
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);

    $this->assertDatabaseMissing('users', ['email' => 'unregistered@example.com']);
});

test('a System Administrator IdP login is denied even if the email happens to match an OGOS student', function () {
    // Regression guard: deny-by-default must be checked BEFORE the OGOS
    // auto-registration fallback, or a System-Administrator-typed IdP
    // account could slip in as an auto-registered student.
    $this->mock(\App\Services\Ogos\OgosStudentService::class, function ($mock) {
        $mock->shouldNotReceive('getClient');
    });

    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'              => 'sysadmin-with-ogos-email',
        'email'           => 'coincidental@example.com',
        'account_type_id' => 1,
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);
});
