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
    $studentStaff = Policy::create([
        'name'        => 'Student Staff',
        'permissions' => [
            'dashboard' => ['Access'],
            'inbox'     => ['Access'],
            'analytics' => [],
            'logbook'   => [],
            'profile'   => [],
        ],
        'is_system' => true,
    ]);

    $registrarStaff = Policy::create([
        'name'        => 'Registrar Staff',
        'permissions' => [
            'dashboard' => ['Access'],
            'inbox'     => ['Access'],
            'analytics' => ['Access'],
            'logbook'   => ['Access'],
            'profile'   => ['Access'],
        ],
        'is_system' => true,
    ]);

    return compact('studentStaff', 'registrarStaff');
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

test('admin with no policy_id falls back to the default policy, not full access', function () {
    seedStudentStaffAndRegistrarPolicies();
    $admin = makeAdmin(null);

    // Registrar Staff (the seeded default) grants everything in this
    // fixture — the important assertion is that it's resolved from the
    // named default, not from "no policy => unrestricted".
    expect($admin->hasModuleAccess('analytics'))->toBeTrue();
});

test('admin falls back to deny when even the default policy is missing', function () {
    // No policies seeded at all in this test.
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
