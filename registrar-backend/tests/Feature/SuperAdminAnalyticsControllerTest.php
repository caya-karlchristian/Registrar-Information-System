<?php

use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\Policy;
use App\Models\RoleAssignment;
use App\Models\SystemUser;
use App\Models\UnmatchedCashierItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// SuperAdminAnalyticsController caches every panel (see its class
// docblock — Redis in production, the 'array' driver in testing). The
// 'array' store lives in memory for the lifetime of the PHP process, and
// Pest runs every test in this file in the same process — RefreshDatabase
// rolls back the database between tests, but does nothing to that cache.
// Without this, whichever test hits a given endpoint+params combination
// FIRST permanently "wins" that cache entry for every later test in the
// file, regardless of what data that later test actually seeded. Flushing
// the 'analytics' tag before each test keeps this file's tests isolated
// from each other the same way the DB transaction already does.
beforeEach(fn () => Cache::tags(['analytics'])->flush());

// ── Helpers ──────────────────────────────────────────────────────────────────

function saMakeUser(int $roleId): SystemUser
{
    $user = SystemUser::factory()->create(['role_id' => $roleId, 'status' => 'Activated']);
    Sanctum::actingAs($user);
    return $user;
}

/**
 * Writes an audit_logs row directly rather than through AuditLogger — the
 * hash chain isn't what's under test here, and prev_hash/hash are nullable
 * at the DB level specifically to allow this kind of direct insert.
 */
function saWriteAuditLog(string $action, array $overrides = []): AuditLog
{
    return AuditLog::create(array_merge([
        'user_id'    => null,
        'email'      => 'system@ris.local',
        'role_name'  => 'super_admin',
        'action'     => $action,
        'created_at' => now(),
    ], $overrides));
}

/**
 * No AccessRequestFactory exists in this codebase (see
 * AccessRequestServiceTest, which also builds rows via AccessRequest::
 * create() directly) — this mirrors that same pattern with sensible
 * defaults for throughput-metric tests, which only care about status/
 * created_at/reviewed_at, not the target-identity fields.
 *
 * Deliberately creates a fresh `requested_by` SystemUser on every call
 * rather than memoizing one in a `static` local — RefreshDatabase rolls
 * back the DB after each test, but a PHP `static` variable would keep
 * pointing at the now-rolled-back row's id in the next test (Pest runs
 * every test in this file in one process), producing a foreign-key
 * violation on insert. One extra factory call per access request is
 * cheap; a flaky FK error chasing a stale in-memory reference is not.
 */
function saAccessRequest(array $overrides = []): AccessRequest
{
    $submitter = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN]);

    return AccessRequest::create(array_merge([
        'requested_by'      => $submitter->user_id,
        'target_email'      => 'target' . uniqid() . '@example.com',
        'target_first_name' => 'Test',
        'target_last_name'  => 'Target',
        'requested_role_id' => SystemUser::ROLE_ADMIN,
        'justification'     => 'Regression fixture.',
        'status'            => AccessRequest::STATUS_REQUESTED,
        'expires_at'        => now()->addDays(7),
    ], $overrides));
}

// ═════════════════════════════════════════════════════════════════════════════
// Access control
// ═════════════════════════════════════════════════════════════════════════════

test('a plain admin cannot reach system-analytics endpoints', function () {
    saMakeUser(SystemUser::ROLE_ADMIN);

    $this->getJson('/api/system-analytics/admin-roster-health')->assertForbidden();
    $this->getJson('/api/system-analytics/access-request-throughput')->assertForbidden();
    $this->getJson('/api/system-analytics/cashier-verification-health')->assertForbidden();
});

test('a student cannot reach system-analytics endpoints', function () {
    saMakeUser(SystemUser::ROLE_STUDENT);

    $this->getJson('/api/system-analytics/admin-roster-health')->assertForbidden();
});

test('an unauthenticated request is rejected', function () {
    $this->getJson('/api/system-analytics/admin-roster-health')->assertUnauthorized();
});

test('a super admin can reach every system-analytics endpoint', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();
    $this->getJson('/api/system-analytics/access-request-throughput')->assertOk();
    $this->getJson('/api/system-analytics/cashier-verification-health')->assertOk();
});

// ═════════════════════════════════════════════════════════════════════════════
// adminRosterHealth()
// ═════════════════════════════════════════════════════════════════════════════

test('role breakdown only counts admin/super-admin role assignments, not student/alumni baseline rows', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    // Student baseline row — must NOT leak into the admin/super-admin
    // breakdown (role_assignments holds one of these per user, see the
    // backfill migration referenced in SuperAdminAnalyticsService).
    $student = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT, 'status' => 'Activated']);
    RoleAssignment::create([
        'user_id' => $student->user_id,
        'role_id' => SystemUser::ROLE_STUDENT,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    $admin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'status' => 'Activated']);
    RoleAssignment::create([
        'user_id' => $admin->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_ACTIVE,
    ]);

    $response = $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();

    $adminRow = collect($response->json('role_breakdown'))->firstWhere('role_id', SystemUser::ROLE_ADMIN);
    expect($adminRow['active_count'])->toBe(1);

    $studentRow = collect($response->json('role_breakdown'))->firstWhere('role_id', SystemUser::ROLE_STUDENT);
    expect($studentRow)->toBeNull();
});

test('an Active row whose expires_at has already elapsed is bucketed as due_to_expire, not active', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $admin = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN, 'status' => 'Activated']);

    // Still status = Active in the DB (the daily sweep hasn't run) but
    // expires_at is in the past — must be reported as due_to_expire, not
    // active, mirroring RoleAssignment::scopeActive()'s live behavior.
    RoleAssignment::create([
        'user_id'    => $admin->user_id,
        'role_id'    => SystemUser::ROLE_ADMIN,
        'status'     => RoleAssignment::STATUS_ACTIVE,
        'expires_at' => now()->subHour(),
    ]);

    $response = $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();
    $adminRow = collect($response->json('role_breakdown'))->firstWhere('role_id', SystemUser::ROLE_ADMIN);

    expect($adminRow['active_count'])->toBe(0);
    expect($adminRow['due_to_expire_count'])->toBe(1);
});

test('revoked and expired role assignments are counted in their own buckets', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    $revokedUser = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN]);
    RoleAssignment::create([
        'user_id' => $revokedUser->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_REVOKED,
    ]);

    $expiredUser = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_ADMIN]);
    RoleAssignment::create([
        'user_id' => $expiredUser->user_id,
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => RoleAssignment::STATUS_EXPIRED,
    ]);

    $response = $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();
    $adminRow = collect($response->json('role_breakdown'))->firstWhere('role_id', SystemUser::ROLE_ADMIN);

    expect($adminRow['revoked_count'])->toBe(1);
    expect($adminRow['expired_count'])->toBe(1);
});

test('pending activations are listed and flagged when expiring within 3 days', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    SystemUser::factory()->create([
        'role_id'            => SystemUser::ROLE_ADMIN,
        'status'             => 'Pending Activation',
        'pending_expires_at' => now()->addDay(),
    ]);

    SystemUser::factory()->create([
        'role_id'            => SystemUser::ROLE_ADMIN,
        'status'             => 'Pending Activation',
        'pending_expires_at' => now()->addDays(10),
    ]);

    $response = $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();

    expect($response->json('pending_activations.total'))->toBe(2);
    expect($response->json('pending_activations.expiring_soon'))->toBe(1);
});

test('IDP sync failures older than 30 days are excluded from the count', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    saWriteAuditLog(AuditLog::ACTION_ADMIN_IDP_SYNC_FAILED, [
        'target_email' => 'recent@example.com',
        'created_at'   => now()->subDays(5),
    ]);
    saWriteAuditLog(AuditLog::ACTION_ADMIN_IDP_SYNC_FAILED, [
        'target_email' => 'old@example.com',
        'created_at'   => now()->subDays(45),
    ]);

    $response = $this->getJson('/api/system-analytics/admin-roster-health')->assertOk();

    expect($response->json('idp_sync_failures.count_last_30_days'))->toBe(1);
    expect($response->json('idp_sync_failures.recent.0.target_email'))->toBe('recent@example.com');
});

// ═════════════════════════════════════════════════════════════════════════════
// accessRequestThroughput()
// ═════════════════════════════════════════════════════════════════════════════

test('approval_rate is computed from fulfilled vs rejected, not the unused Approved status', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    // Mirrors AccessRequestService::approve(), which writes STATUS_FULFILLED
    // directly — STATUS_APPROVED is never actually persisted in practice.
    for ($i = 0; $i < 3; $i++) {
        saAccessRequest(['status' => AccessRequest::STATUS_FULFILLED, 'reviewed_at' => now()]);
    }
    saAccessRequest(['status' => AccessRequest::STATUS_REJECTED, 'reviewed_at' => now()]);
    for ($i = 0; $i < 2; $i++) {
        saAccessRequest(['status' => AccessRequest::STATUS_REQUESTED]);
    }

    $response = $this->getJson('/api/system-analytics/access-request-throughput?range=all')->assertOk();

    expect($response->json('total'))->toBe(6);
    expect($response->json('fulfilled'))->toBe(3);
    expect($response->json('rejected'))->toBe(1);
    // 3 / (3 + 1) = 75%. Compared with toEqual (loose ==), not toBe
    // (strict ===): PHP's json_encode() drops the trailing .0 from a
    // whole-number float unless JSON_PRESERVE_ZERO_FRACTION is set, which
    // Laravel's response()->json() doesn't set by default — so this
    // decodes back as the int 75, not the float 75.0. match_rate's 66.7
    // assertion elsewhere in this file doesn't hit this, since it isn't a
    // whole number.
    expect($response->json('approval_rate'))->toEqual(75.0);
});

test('avg_time_to_review_hours is null when nothing has been reviewed yet', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    saAccessRequest(['status' => AccessRequest::STATUS_REQUESTED, 'reviewed_at' => null]);

    $response = $this->getJson('/api/system-analytics/access-request-throughput?range=all')->assertOk();

    expect($response->json('avg_time_to_review_hours'))->toBeNull();
    expect($response->json('approval_rate'))->toBeNull();
});

// ═════════════════════════════════════════════════════════════════════════════
// cashierVerificationHealth()
// ═════════════════════════════════════════════════════════════════════════════

test('match rate is computed from cashier_verification audit entries', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    saWriteAuditLog(AuditLog::ACTION_CASHIER_VERIFICATION, ['metadata' => ['final_approved' => true]]);
    saWriteAuditLog(AuditLog::ACTION_CASHIER_VERIFICATION, ['metadata' => ['final_approved' => true]]);
    saWriteAuditLog(AuditLog::ACTION_CASHIER_VERIFICATION, ['metadata' => ['final_approved' => false]]);

    $response = $this->getJson('/api/system-analytics/cashier-verification-health?range=all')->assertOk();

    expect($response->json('total_attempts'))->toBe(3);
    expect($response->json('matched'))->toBe(2);
    expect($response->json('unmatched'))->toBe(1);
    // 2 / 3 = 66.7%
    expect($response->json('match_rate'))->toBe(66.7);
});

test('unresolved backlog counts only unmatched cashier items with no resolved_at', function () {
    saMakeUser(SystemUser::ROLE_SUPER_ADMIN);

    UnmatchedCashierItem::create([
        'raw_label'         => 'Transcript Fee',
        'normalised_label'  => 'transcript fee',
        'occurrence_count'  => 5,
        'first_seen_at'     => now(),
        'last_seen_at'      => now(),
    ]);
    UnmatchedCashierItem::create([
        'raw_label'         => 'Diploma Fee',
        'normalised_label'  => 'diploma fee',
        'occurrence_count'  => 1,
        'first_seen_at'     => now(),
        'last_seen_at'      => now(),
        'resolved_at'       => now(),
    ]);

    $response = $this->getJson('/api/system-analytics/cashier-verification-health?range=all')->assertOk();

    expect($response->json('unresolved_backlog'))->toBe(1);
    expect($response->json('top_backlog_items.0.raw_label'))->toBe('Transcript Fee');
});