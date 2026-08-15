<?php

use App\Exceptions\UnregisteredAccountException;
use App\Models\AuditLog;
use App\Models\RoleAssignment;
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
// Baseline role_assignments backfill (Gap 1 fix)
//
// The real-world shape this locks in: a SystemUser with ZERO
// role_assignments rows — exactly what UserProvisioningService::provision()
// and AdminUserService::create() produced before ensureBaselineRoleAssignment()
// existed, and what the backfill migration only ever fixed retroactively
// for accounts that existed at the time it ran. Every fixture below is
// built with SystemUser::factory()->create() and deliberately does NOT
// manually seed a role_assignments row first, unlike the rest of this
// suite's fixtures elsewhere in the project — that's the point.
// ═════════════════════════════════════════════════════════════════════════════

test('first SSO login backfills a baseline Active role_assignments row for a fresh account', function () {
    $pending = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Pending Activation',
        'idp_user_id' => null,
        'password'    => null,
        'pending_expires_at' => now()->addDays(14),
    ]);

    expect(RoleAssignment::where('user_id', $pending->user_id)->exists())->toBeFalse();

    app(UserProvisioningService::class)->provision([
        'id'    => 'idp-user-baseline',
        'email' => $pending->email,
    ], upsRequest());

    $baseline = RoleAssignment::where('user_id', $pending->user_id)->first();

    expect($baseline)->not->toBeNull();
    expect($baseline->role_id)->toBe(SystemUser::ROLE_ADMIN);
    expect($baseline->status)->toBe(RoleAssignment::STATUS_ACTIVE);
    expect($baseline->granted_by)->toBeNull();
    expect($baseline->expires_at)->toBeNull();
});

test('re-provisioning an already-backfilled account does not create a duplicate baseline row', function () {
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'already-linked',
    ]);

    RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'granted_at' => now(),
    ]);

    app(UserProvisioningService::class)->provision([
        'id'    => 'already-linked',
        'email' => $admin->email,
    ], upsRequest());

    expect(RoleAssignment::where('user_id', $admin->user_id)->count())->toBe(1);
});

test('granting a second role onto a freshly-provisioned user (no manually-seeded baseline row) leaves the switcher usable', function () {
    // Simulates the exact end-to-end sequence Gap 1 described: a student
    // logs in for the first time (provision() runs and — with the fix —
    // creates their baseline Student row), then a Super Admin grants them
    // Admin. Both rows must exist afterward, or Navigation.jsx's
    // roleAssignments.length > 1 switcher gate never fires and
    // RoleAssignmentService::switchTo() can never return them to Student.
    $student = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_STUDENT,
        'status'      => 'Activated',
        'idp_user_id' => null,
    ]);

    expect(RoleAssignment::where('user_id', $student->user_id)->exists())->toBeFalse();

    app(UserProvisioningService::class)->provision([
        'id'    => 'idp-student-fresh',
        'email' => $student->email,
    ], upsRequest());

    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);

    app(App\Services\RoleAssignmentService::class)->grant([
        'user_id'    => $student->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'expires_at' => now()->addMonths(4),
    ], roleAssignmentTestRequest($superAdmin));

    $activeRoleIds = RoleAssignment::where('user_id', $student->user_id)
        ->where('status', RoleAssignment::STATUS_ACTIVE)
        ->pluck('role_id');

    expect($activeRoleIds)->toHaveCount(2);
    expect($activeRoleIds)->toContain(SystemUser::ROLE_STUDENT, SystemUser::ROLE_ADMIN);
});

// ═════════════════════════════════════════════════════════════════════════════
// Deny-by-default: no RIS record + admin-tier IdP account type
//
// Fixture shape (`roles: "Admin"`) is captured from a real GET /api/v1/me
// response, not guessed — see UserProvisioningService::isSystemAdministratorAccountType()
// docblock.
// ═════════════════════════════════════════════════════════════════════════════

test('an admin-tier IdP login with no matching RIS record is denied', function () {
    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'    => 'unregistered-idp-id',
        'email' => 'unregistered@example.com',
        'roles' => 'Admin',
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);

    $this->assertDatabaseMissing('users', ['email' => 'unregistered@example.com']);
});

test('an admin-tier IdP login is denied even if the email happens to match an OGOS student', function () {
    // Regression guard: deny-by-default must be checked BEFORE the OGOS
    // auto-registration fallback, or an admin-typed IdP account could
    // slip in as an auto-registered student.
    $this->mock(\App\Services\Ogos\OgosStudentService::class, function ($mock) {
        $mock->shouldNotReceive('getClient');
    });

    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'    => 'sysadmin-with-ogos-email',
        'email' => 'coincidental@example.com',
        'roles' => 'Admin',
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);
});

test('the admin-tier check is case-insensitive', function () {
    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'    => 'lowercase-role-idp-id',
        'email' => 'lowercase-role@example.com',
        'roles' => 'admin', // IdP casing isn't guaranteed to stay "Admin"
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// Non-admin IdP profiles: `roles` is confirmed absent entirely (not null,
// not empty string) for students and other non-admin account types. This
// must NOT be misread as admin-tier, and must fall through to the OGOS
// auto-registration branch instead of being denied outright.
// ═════════════════════════════════════════════════════════════════════════════

test('an IdP profile with no roles field is not treated as admin-tier and falls through to the OGOS check', function () {
    $ogosClient = \Mockery::mock(\App\Services\Ogos\OgosClient::class);
    $ogosClient->shouldReceive('getStudentByEmail')
        ->once()
        ->with('student@example.com')
        ->andThrow(new \App\Exceptions\OgosException('not found in OGOS'));

    $this->mock(\App\Services\Ogos\OgosStudentService::class, function ($mock) use ($ogosClient) {
        $mock->shouldReceive('getClient')->once()->andReturn($ogosClient);
    });

    $service = app(UserProvisioningService::class);

    expect(fn () => $service->provision([
        'id'    => 'student-idp-id',
        'email' => 'student@example.com',
        // No `roles` key at all — matches the real non-admin /me shape.
    ], upsRequest()))->toThrow(UnregisteredAccountException::class);
});

// ═════════════════════════════════════════════════════════════════════════════
// idp_user_id-first matching (PUP webmail email-change fix)
//
// Background: provision() used to match SystemUser::where('email', $email)
// only. If a user changed their PUP webmail address at the IdP, the next
// login wouldn't find their existing row at all — it would fall through to
// auto-registration and create a SECOND SystemUser row under the new email,
// orphaning every bit of history (document requests, role assignments,
// notifications, audit trail) under the old, now-unreachable row.
//
// The fix matches by idp_user_id first (the durable identity the IdP
// itself doesn't change when email changes), falling back to email only
// when there's no idp_user_id match yet (first-ever login). Every test
// below uses ROLE_ADMIN with status 'Activated', mirroring the existing
// "an already-Activated admin logging in again" fixture above — this
// avoids provisionProfile() reaching out to the real OGOS/PUPTAPS clients,
// which only fire for STUDENT/ALUMNI roles.
// ═════════════════════════════════════════════════════════════════════════════

test('an existing user is matched by idp_user_id and their stale email is synced', function () {
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'stable-idp-uuid',
        'email'       => 'old.email@pup.edu.ph',
    ]);

    $result = app(UserProvisioningService::class)->provision([
        'id'    => 'stable-idp-uuid',
        'email' => 'new.email@pup.edu.ph', // changed at the IdP
    ], upsRequest());

    $admin->refresh();

    expect($result->user->user_id)->toBe($admin->user_id);
    expect($admin->email)->toBe('new.email@pup.edu.ph');
    expect($admin->idp_user_id)->toBe('stable-idp-uuid');
});

test('a changed email no longer creates a duplicate account (regression guard)', function () {
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'stable-idp-uuid-2',
        'email'       => 'legacy@pup.edu.ph',
    ]);

    app(UserProvisioningService::class)->provision([
        'id'    => 'stable-idp-uuid-2',
        'email' => 'freshlychanged@pup.edu.ph',
    ], upsRequest());

    // The whole point of the fix: exactly one row, matched and updated in
    // place — not a second row created under the new email while the old
    // one silently sticks around holding all the real history.
    expect(SystemUser::count())->toBe(1);
    expect(SystemUser::where('email', 'legacy@pup.edu.ph')->exists())->toBeFalse();
    expect(SystemUser::where('email', 'freshlychanged@pup.edu.ph')->count())->toBe(1);
});

test('idp_user_id match is used even though it would not have been found by the new email', function () {
    // Same case as above, phrased as a direct regression check against the
    // OLD matching behavior: SystemUser::where('email', $newEmail) would
    // have returned null here (nothing has that email yet), which is
    // exactly what used to trigger the false "not pre-registered" branch.
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'stable-idp-uuid-4',
        'email'       => 'before@pup.edu.ph',
    ]);

    expect(SystemUser::where('email', 'after@pup.edu.ph')->exists())->toBeFalse();

    $result = app(UserProvisioningService::class)->provision([
        'id'    => 'stable-idp-uuid-4',
        'email' => 'after@pup.edu.ph',
    ], upsRequest());

    expect($result->user->user_id)->toBe($admin->user_id);
});

test('email sync is skipped, not thrown, when the new email already belongs to a different user', function () {
    $other = SystemUser::factory()->create([
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => 'Activated',
        'email'   => 'taken@pup.edu.ph',
    ]);

    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => 'stable-idp-uuid-3',
        'email'       => 'mine@pup.edu.ph',
    ]);

    // Must not throw — a data conflict here shouldn't block the person
    // from logging in; it should just skip the sync and log it.
    $result = app(UserProvisioningService::class)->provision([
        'id'    => 'stable-idp-uuid-3',
        'email' => 'taken@pup.edu.ph', // collides with $other
    ], upsRequest());

    $admin->refresh();
    $other->refresh();

    expect($result->user->user_id)->toBe($admin->user_id);
    // Neither row's email was touched — the conflict was left for a human,
    // not auto-resolved by silently overwriting either record.
    expect($admin->email)->toBe('mine@pup.edu.ph');
    expect($other->email)->toBe('taken@pup.edu.ph');
});

test('a profile with no id key still matches an existing user by email, without error', function () {
    // Defensive case: idp_user_id lookup is skipped entirely when the IdP
    // profile has no 'id' key, falling straight to the email path — same
    // as the very first login for a brand-new/pending account.
    $admin = SystemUser::factory()->create([
        'role_id'     => SystemUser::ROLE_ADMIN,
        'status'      => 'Activated',
        'idp_user_id' => null,
        'email'       => 'noidp@pup.edu.ph',
    ]);

    $result = app(UserProvisioningService::class)->provision([
        'email' => 'noidp@pup.edu.ph',
        // no 'id' key at all
    ], upsRequest());

    expect($result->user->user_id)->toBe($admin->user_id);
});