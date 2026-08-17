<?php

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Policy;
use App\Models\RequestPurpose;
use App\Models\RequestStatus;
use App\Models\StudentAcademicRecord;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a SystemUser with a Sanctum token and act as them.
 * Returns the user so tests can reference it.
 */
function makeUser(int $roleId): SystemUser
{
    $user = SystemUser::factory()->create(['role_id' => $roleId, 'status' => 'Activated']);
    Sanctum::actingAs($user);
    return $user;
}

/**
 * Seed the minimum reference rows needed for document request tests.
 */
function seedReferenceData(): array
{
    $status  = RequestStatus::firstOrCreate(['status_id' => 1], ['status_name' => 'Processing']);
    RequestStatus::firstOrCreate(['status_id' => 2], ['status_name' => 'Ready to Claim']);
    RequestStatus::firstOrCreate(['status_id' => 3], ['status_name' => 'Completed']);
    RequestStatus::firstOrCreate(['status_id' => 4], ['status_name' => 'Forfeited']);
    RequestStatus::firstOrCreate(['status_id' => 5], ['status_name' => 'Cancelled']);
    $purpose = RequestPurpose::firstOrCreate(['request_purpose_id' => 1], ['purpose_name' => 'DFA']);
    $docType = DocumentType::firstOrCreate(
        ['document_type_id' => 1],
        ['document_name' => 'Transcript of Records', 'document_description' => '', 'document_process_period' => 5, 'access_id' => 1]
    );
    return compact('status', 'purpose', 'docType');
}

/**
 * Create a student user with the minimum profile rows needed to submit a request.
 */
function makeStudentWithProfile(): SystemUser
{
    $user    = makeUser(SystemUser::ROLE_STUDENT);
    $profile = StudentProfile::factory()->create(['user_id' => $user->user_id]);
    StudentAcademicRecord::factory()->create(['student_profile_id' => $profile->student_profile_id]);
    return $user;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 — Unauthenticated requests are rejected
// ═════════════════════════════════════════════════════════════════════════════

test('unauthenticated request to protected endpoint returns 401', function () {
    $response = $this->getJson('/api/me');
    $response->assertStatus(401);
});

test('unauthenticated request to document-requests returns 401', function () {
    $response = $this->getJson('/api/document-requests');
    $response->assertStatus(401);
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 — /api/me returns the authenticated user's data
// ═════════════════════════════════════════════════════════════════════════════

test('GET /me returns the authenticated user with correct role_name', function () {
    $user = makeUser(SystemUser::ROLE_STUDENT);

    $response = $this->getJson('/api/me');

    $response->assertOk()
             ->assertJsonPath('data.user_id',   $user->user_id)
             ->assertJsonPath('data.email',     $user->email)
             ->assertJsonPath('data.role_name', 'student');
});

test('GET /me for admin returns role_name = admin', function () {
    makeUser(SystemUser::ROLE_ADMIN);

    $this->getJson('/api/me')
         ->assertOk()
         ->assertJsonPath('data.role_name', 'admin');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 — Student can create a document request
// ═════════════════════════════════════════════════════════════════════════════

test('student can submit a document request', function () {
    // Without this, CASHIER_API_KEY can leak in from the local .env via
    // docker-compose.local.yml's env_file: .env on the backend service —
    // phpunit.xml's <env> block doesn't list CASHIER_API_KEY, so it isn't
    // forced back to empty the way APP_ENV etc. are. That flips
    // CashierService into live mode and this OR number, which isn't a
    // real receipt, gets rejected as NOT_FOUND instead of accepted.
    // Every other cashier-touching test in this suite sets this
    // explicitly for the same reason — see CashierTest.php, RisGapTest.php.
    config(['services.cashier.api_key' => '']);

    $user = makeStudentWithProfile();
    ['purpose' => $purpose, 'docType' => $docType] = seedReferenceData();

    $payload = [
        'request_purpose_id' => $purpose->request_purpose_id,
        'or_number'          => '1234567',
        'receipt_date'       => now()->toDateString(),
        'documents'          => [[
            'document_type_id'  => $docType->document_type_id,
            'number_of_copies'  => 2,
        ]],
    ];

    $response = $this->postJson('/api/document-requests', $payload);

    $response->assertCreated()
             ->assertJsonPath('user_id', $user->user_id)
             ->assertJsonPath('status.status_id', RequestStatusEnum::Processing->value);

    $this->assertDatabaseHas('document_request', ['user_id' => $user->user_id]);
});

test('request with no documents or certificates is rejected', function () {
    makeStudentWithProfile();
    ['purpose' => $purpose] = seedReferenceData();

    $this->postJson('/api/document-requests', [
        'request_purpose_id' => $purpose->request_purpose_id,
        'documents'          => [],
        'certificates'       => [],
    ])->assertStatus(422);
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4 — Role guards: students cannot perform admin actions
// ═════════════════════════════════════════════════════════════════════════════

test('student cannot update a document request status', function () {
    $student = makeStudentWithProfile();
    seedReferenceData();

    // Create a request owned by this student
    $request = DocumentRequest::factory()->create(['user_id' => $student->user_id]);

    // Students are role 1/2 — PUT is restricted to role 3 (admin)
    $this->putJson("/api/document-requests/{$request->request_id}", [
        'status_id' => RequestStatusEnum::ReadyToClaim->value,
    ])->assertStatus(403);
});

test('student cannot access analytics endpoints', function () {
    makeUser(SystemUser::ROLE_STUDENT);

    $this->getJson('/api/analytics/overview')->assertStatus(403);
});

test('student cannot access system-users endpoint', function () {
    makeUser(SystemUser::ROLE_STUDENT);

    $this->getJson('/api/system-users')->assertStatus(403);
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 5 — Admin can update a document request status
// ═════════════════════════════════════════════════════════════════════════════

test('admin can update document request status to ready-to-claim', function () {
    // Create the student whose request will be updated
    $student = SystemUser::factory()->create(['role_id' => SystemUser::ROLE_STUDENT, 'status' => 'Activated']);
    $profile = StudentProfile::factory()->create(['user_id' => $student->user_id]);
    StudentAcademicRecord::factory()->create(['student_profile_id' => $profile->student_profile_id]);

    seedReferenceData();

    $docRequest = DocumentRequest::factory()->create([
        'user_id'   => $student->user_id,
        'status_id' => RequestStatusEnum::Processing->value,
    ]);

    // Switch to admin
    makeUser(SystemUser::ROLE_ADMIN);

    $this->putJson("/api/document-requests/{$docRequest->request_id}", [
        'status_id' => RequestStatusEnum::ReadyToClaim->value,
    ])->assertOk()
      ->assertJsonPath('status.status_id', RequestStatusEnum::ReadyToClaim->value);

    $this->assertDatabaseHas('document_request', [
        'request_id' => $docRequest->request_id,
        'status_id'  => RequestStatusEnum::ReadyToClaim->value,
    ]);
});

test('admin can view analytics overview', function () {
    // Since the default-policy fallback fix (Policy::DEFAULT_NAME now
    // resolves to the zero-access "No Access" policy instead of silently
    // granting "Registrar Staff"), a plain admin with no policy_id no
    // longer has analytics access by default. Explicitly attach a policy
    // that grants it, matching how a real admin would be provisioned.
    $policy = Policy::create([
        'name'        => 'Test Analytics Access',
        'permissions' => ['analytics' => ['Access']],
        'is_system'   => false,
    ]);
    $admin = makeUser(SystemUser::ROLE_ADMIN);
    $admin->update(['policy_id' => $policy->policy_id]);
    seedReferenceData();

    $this->getJson('/api/analytics/overview')->assertOk();
});