<?php

use App\Models\Policy;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAdmin(?int $policyId = null): SystemUser
{
    $admin = SystemUser::factory()->create([
        'role_id'   => SystemUser::ROLE_ADMIN,
        'status'    => 'Activated',
        'policy_id' => $policyId,
    ]);
    Sanctum::actingAs($admin);

    return $admin;
}

function seedStudentStaffAndRegistrarPolicies(): array
{
    // The create_policies_table migration already seeds "Student Staff"
    // and "Registrar Staff" as is_system rows (RefreshDatabase runs
    // migrations once, so they exist before any test body runs). Use
    // updateOrCreate rather than create() so this helper works regardless
    // of that pre-seeded state, and so this fixture's intentionally
    // different "Registrar Staff" permissions (full access, for exercising
    // the happy path) win over the migration's more restrictive defaults.
    $studentStaff = Policy::updateOrCreate(
        ['name' => 'Student Staff'],
        [
            'permissions' => [
                'dashboard' => ['Access'],
                'inbox'     => ['Access'],
                'analytics' => [],
                'logbook'   => [],
                'profile'   => [],
            ],
            'is_system' => true,
        ]
    );

    $registrarStaff = Policy::updateOrCreate(
        ['name' => 'Registrar Staff'],
        [
            'permissions' => [
                'dashboard' => ['Access'],
                'inbox'     => ['Access'],
                'analytics' => ['Access'],
                'logbook'   => ['Access'],
                'profile'   => ['Access'],
            ],
            'is_system' => true,
        ]
    );

    return compact('studentStaff', 'registrarStaff');
}

function seedZeroAccessDefaultPolicy(): Policy
{
    // Policy::DEFAULT_NAME ("No Access") is seeded by the
    // 2026_08_03_000005_seed_zero_access_default_policy migration, which
    // already runs as part of RefreshDatabase. updateOrCreate here just
    // makes this fixture explicit and self-contained rather than relying
    // on migration timing, matching the pattern above.
    return Policy::updateOrCreate(
        ['name' => Policy::DEFAULT_NAME],
        [
            'permissions' => [
                'dashboard' => [],
                'inbox'     => [],
                'analytics' => [],
                'logbook'   => [],
                'profile'   => [],
            ],
            'is_system' => true,
        ]
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// UNIT — SystemUser::hasModuleAccess() / effectivePermissions()
// ═════════════════════════════════════════════════════════════════════════════

test('super admin has access to every module regardless of policy', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);

    foreach (Policy::MODULE_KEYS as $module) {
        expect($superAdmin->hasModuleAccess($module))->toBeTrue();
    }
});

test('students and alumni are never gated by the policy system', function () {
    $student = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT]);
    $alumni  = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ALUMNI]);

    expect($student->hasModuleAccess('analytics'))->toBeTrue()
        ->and($alumni->hasModuleAccess('logbook'))->toBeTrue();
});

test('admin with Student Staff policy only has dashboard and inbox', function () {
    ['studentStaff' => $studentStaff] = seedStudentStaffAndRegistrarPolicies();
    $admin = makeAdmin($studentStaff->policy_id);

    expect($admin->hasModuleAccess('dashboard'))->toBeTrue()
        ->and($admin->hasModuleAccess('inbox'))->toBeTrue()
        ->and($admin->hasModuleAccess('analytics'))->toBeFalse()
        ->and($admin->hasModuleAccess('logbook'))->toBeFalse()
        ->and($admin->hasModuleAccess('profile'))->toBeFalse();
});

test('admin with no policy_id falls back to the zero-access default, never an access-granting one', function () {
    // Also seed Registrar Staff/Student Staff (both grant real access) to
    // prove the fallback resolves by Policy::DEFAULT_NAME specifically,
    // not "whatever is_system policy happens to exist first".
    seedStudentStaffAndRegistrarPolicies();
    seedZeroAccessDefaultPolicy();

    $admin = makeAdmin(null);

    foreach (Policy::MODULE_KEYS as $module) {
        expect($admin->hasModuleAccess($module))->toBeFalse();
    }
});

test('an admin created without an explicit policy never inherits Registrar Staff access', function () {
    // Regression test for the historical bug: DEFAULT_NAME used to be
    // 'Registrar Staff', so any admin with no policy_id silently got
    // Analytics + Logbook access instead of nothing. Guard against this
    // ever regressing back, independent of whatever DEFAULT_NAME's exact
    // string value is.
    seedStudentStaffAndRegistrarPolicies();
    seedZeroAccessDefaultPolicy();

    expect(Policy::DEFAULT_NAME)->not->toBe('Registrar Staff');

    $admin = makeAdmin(null);

    expect($admin->hasModuleAccess('analytics'))->toBeFalse()
        ->and($admin->hasModuleAccess('logbook'))->toBeFalse();
});

test('admin falls back to deny when even the default policy is missing', function () {
    // The default-policy row (Policy::DEFAULT_NAME, "No Access") is
    // normally seeded by the 2026_08_03_000005 migration, and
    // RefreshDatabase only migrates once — so that row exists by default
    // in every test in this run. To actually exercise "the default
    // policy is missing", delete it explicitly rather than relying on a
    // blank slate.
    Policy::where('name', Policy::DEFAULT_NAME)->delete();

    $admin = makeAdmin(null);

    expect($admin->hasModuleAccess('analytics'))->toBeFalse();
});

test('unknown module keys are always denied, never accidentally granted', function () {
    ['registrarStaff' => $registrarStaff] = seedStudentStaffAndRegistrarPolicies();
    $admin = makeAdmin($registrarStaff->policy_id);

    expect($admin->hasModuleAccess('billing'))->toBeFalse();
});

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE — EnsureModuleAccess middleware on real routes
// ═════════════════════════════════════════════════════════════════════════════

test('Student Staff admin gets 403 from analytics endpoints', function () {
    ['studentStaff' => $studentStaff] = seedStudentStaffAndRegistrarPolicies();
    makeAdmin($studentStaff->policy_id);

    $this->getJson('/api/analytics/overview')->assertStatus(403);
});

test('Student Staff admin gets 403 from the logbook endpoint', function () {
    ['studentStaff' => $studentStaff] = seedStudentStaffAndRegistrarPolicies();
    makeAdmin($studentStaff->policy_id);

    $this->getJson('/api/document-requests/logbook')->assertStatus(403);
});

test('Registrar Staff admin can reach analytics and logbook', function () {
    ['registrarStaff' => $registrarStaff] = seedStudentStaffAndRegistrarPolicies();
    makeAdmin($registrarStaff->policy_id);

    $this->getJson('/api/analytics/overview')->assertStatus(200);
    $this->getJson('/api/document-requests/logbook')->assertStatus(200);
});

test('super admin reaches analytics even with no policy row in the system at all', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    Sanctum::actingAs($superAdmin);

    $this->getJson('/api/analytics/overview')->assertStatus(200);
});

// ═════════════════════════════════════════════════════════════════════════════
// PolicyService — permission sanitization
// ═════════════════════════════════════════════════════════════════════════════

test('creating a policy silently drops unknown module keys', function () {
    $superAdmin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_SUPER_ADMIN]);
    Sanctum::actingAs($superAdmin);

    $response = $this->postJson('/api/policies', [
        'name'        => 'Custom Policy',
        'permissions' => [
            'dashboard' => ['Access'],
            'billing'   => ['Access'], // not a real module
        ],
    ]);

    $response->assertStatus(201);
    $stored = Policy::where('name', 'Custom Policy')->first();
    expect($stored->permissions)->toHaveKey('dashboard')
        ->and($stored->permissions)->not->toHaveKey('billing');
});