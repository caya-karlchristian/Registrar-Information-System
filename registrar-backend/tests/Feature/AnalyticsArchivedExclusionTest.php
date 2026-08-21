<?php

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\RequestPurpose;
use App\Models\RequestStatus;
use App\Models\SystemUser;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/**
 * Regression coverage for Step 1.0 of the Analytics & Audit Log Revamp plan:
 *
 *   1.0.1 — archived/deleted requests were included in byDocumentType(),
 *           byStatus(), byPurpose(), processingTime(), and
 *           signatureTurnaroundTime() (raw DB::table() queries bypass
 *           DocumentRequest's ExcludeArchivedScope / SoftDeletes global
 *           scopes), while overview()/volumeTrend()/peakHours() (Eloquent
 *           queries) correctly excluded them — a guaranteed source of
 *           "the numbers don't match between panels."
 *
 *   1.0.2 — several panels averaged rh.minutes_processed (cumulative
 *           wall-clock time since requested_at, re-counted on every status
 *           change) instead of rh.business_minutes (correct, calendar-aware
 *           per-segment duration).
 *
 * Each test below sets up one active request and one archived (or
 * soft-deleted) request with deliberately different processing durations,
 * then asserts the archived one is invisible to the panel under test.
 */
function seedAnalyticsFixtures(): array
{
    $status = RequestStatus::firstOrCreate(
        ['status_id' => RequestStatusEnum::Completed->value],
        ['status_name' => 'Completed']
    );

    $purpose = RequestPurpose::firstOrCreate(
        ['request_purpose_id' => 1],
        ['purpose_name' => 'DFA']
    );

    $docType = DocumentType::firstOrCreate(
        ['document_type_id' => 1],
        [
            'document_name'           => 'Transcript of Records',
            'document_process_period' => '3-5 business days',
        ]
    );

    $student = SystemUser::factory()->create([
        'role_id' => SystemUser::ROLE_STUDENT,
        'status'  => 'Activated',
    ]);

    $admin = SystemUser::factory()->create([
        'role_id' => SystemUser::ROLE_ADMIN,
        'status'  => 'Activated',
    ]);

    return compact('status', 'purpose', 'docType', 'student', 'admin');
}

/**
 * Creates a request + its request_document + request_history rows, with
 * $businessMinutes / $minutesProcessed set deliberately far apart so a test
 * asserting "business_minutes was used" and one asserting "archived was
 * excluded" can never accidentally pass for the wrong reason.
 */
function createRequestWithHistory(array $fixtures, bool $archived, int $businessMinutes, int $minutesProcessed, ?string $deletedAt = null): DocumentRequest
{
    $request = DocumentRequest::factory()->create([
        'user_id'             => $fixtures['student']->user_id,
        'status_id'           => $fixtures['status']->status_id,
        'request_purpose_id'  => $fixtures['purpose']->request_purpose_id,
        'requested_at'        => now(),
    ]);

    DB::table('request_document')->insert([
        'request_id'        => $request->request_id,
        'document_type_id'  => $fixtures['docType']->document_type_id,
        'number_of_copies'  => 1,
    ]);

    DB::table('request_history')->insert([
        'request_id'         => $request->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => $fixtures['status']->status_id,
        'changed_at'         => now(),
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => $minutesProcessed,
        'business_minutes'   => $businessMinutes,
    ]);

    if ($archived) {
        DB::table('document_request')
            ->where('request_id', $request->request_id)
            ->update(['is_archived' => true, 'archived_on' => now()]);
    }

    if ($deletedAt) {
        DB::table('document_request')
            ->where('request_id', $request->request_id)
            ->update(['deleted_at' => $deletedAt]);
    }

    return $request;
}

test('byDocumentType excludes archived requests and uses business_minutes', function () {
    $fixtures = seedAnalyticsFixtures();

    // Active: 30 business minutes (should be the ONLY row counted/averaged).
    createRequestWithHistory($fixtures, archived: false, businessMinutes: 30, minutesProcessed: 9999);

    // Archived: would skew both the count and the average if leaked in.
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 500, minutesProcessed: 500);

    $range = [now()->subDay(), now()->addDay()];
    $rows  = (new AnalyticsService())->byDocumentType($range);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['total_documents'])->toBe(1);
    expect((float) $rows[0]['avg_processing_min'])->toBe(30.0);
});

test('byStatus excludes archived and soft-deleted requests', function () {
    $fixtures = seedAnalyticsFixtures();

    createRequestWithHistory($fixtures, archived: false, businessMinutes: 10, minutesProcessed: 10);
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 10, minutesProcessed: 10);
    createRequestWithHistory($fixtures, archived: false, businessMinutes: 10, minutesProcessed: 10, deletedAt: now()->toDateTimeString());

    $range = [now()->subDay(), now()->addDay()];
    $rows  = (new AnalyticsService())->byStatus($range);

    $completedTotal = collect($rows)->firstWhere('status_id', $fixtures['status']->status_id)['total'] ?? 0;

    expect($completedTotal)->toBe(1);
});

test('byPurpose excludes archived requests', function () {
    $fixtures = seedAnalyticsFixtures();

    createRequestWithHistory($fixtures, archived: false, businessMinutes: 10, minutesProcessed: 10);
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 10, minutesProcessed: 10);

    $range = [now()->subDay(), now()->addDay()];
    $rows  = (new AnalyticsService())->byPurpose($range);

    $purposeTotal = collect($rows)->firstWhere('purpose_id', $fixtures['purpose']->request_purpose_id)['total'] ?? 0;

    expect($purposeTotal)->toBe(1);
});

test('processingTime by_document_type and by_admin exclude archived requests and use business_minutes', function () {
    $fixtures = seedAnalyticsFixtures();

    createRequestWithHistory($fixtures, archived: false, businessMinutes: 20, minutesProcessed: 8888);
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 900, minutesProcessed: 900);

    $range = [now()->subDay(), now()->addDay()];
    $result = (new AnalyticsService())->processingTime($range);

    expect($result['by_document_type'])->toHaveCount(1);
    expect((float) $result['by_document_type'][0]->avg_minutes)->toBe(20.0);

    expect($result['by_admin'])->toHaveCount(1);
    expect((int) $result['by_admin'][0]->requests_handled)->toBe(1);
    expect((float) $result['by_admin'][0]->avg_minutes)->toBe(20.0);
});

/**
 * Step 1a/1b/1c regression coverage — the new Staff Performance metrics
 * (min/max spread, active-day rate, forfeit-rate quality signal).
 */
test('processingTime by_admin reports min/max spread, active-day rate, and forfeit rate', function () {
    $fixtures = seedAnalyticsFixtures();

    // Same admin, two requests on two different (business) days, one
    // Completed (10 min) and one Forfeited (60 min) — exercises min/max,
    // active_days = 2 (=> rate 1.0/day), and a 50% forfeit rate.
    $day1 = now()->startOfWeek()->setTime(9, 0);
    $day2 = now()->startOfWeek()->addDay()->setTime(9, 0);

    $completed = DocumentRequest::factory()->create([
        'user_id'            => $fixtures['student']->user_id,
        'status_id'          => $fixtures['status']->status_id, // Completed
        'request_purpose_id' => $fixtures['purpose']->request_purpose_id,
        'requested_at'       => $day1,
    ]);
    DB::table('request_document')->insert([
        'request_id'       => $completed->request_id,
        'document_type_id' => $fixtures['docType']->document_type_id,
        'number_of_copies' => 1,
    ]);
    DB::table('request_history')->insert([
        'request_id'         => $completed->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => $fixtures['status']->status_id,
        'changed_at'         => $day1,
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => 10,
        'business_minutes'   => 10,
    ]);

    $forfeitedStatus = RequestStatus::firstOrCreate(
        ['status_id' => RequestStatusEnum::Forfeited->value],
        ['status_name' => 'Forfeited']
    );

    $forfeited = DocumentRequest::factory()->create([
        'user_id'            => $fixtures['student']->user_id,
        'status_id'          => $forfeitedStatus->status_id,
        'request_purpose_id' => $fixtures['purpose']->request_purpose_id,
        'requested_at'       => $day2,
    ]);
    DB::table('request_document')->insert([
        'request_id'       => $forfeited->request_id,
        'document_type_id' => $fixtures['docType']->document_type_id,
        'number_of_copies' => 1,
    ]);
    DB::table('request_history')->insert([
        'request_id'         => $forfeited->request_id,
        'old_status_id'      => RequestStatusEnum::ReadyToClaim->value,
        'new_status_id'      => $forfeitedStatus->status_id,
        'changed_at'         => $day2,
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => 60,
        'business_minutes'   => 60,
    ]);

    $range  = [$day1->copy()->subDay(), $day2->copy()->addDay()];
    $result = (new AnalyticsService())->processingTime($range);

    expect($result['by_admin'])->toHaveCount(1);
    $row = $result['by_admin'][0];

    expect((float) $row->min_minutes)->toBe(10.0);
    expect((float) $row->max_minutes)->toBe(60.0);
    expect((int) $row->sample_count)->toBe(2);
    expect((int) $row->requests_handled)->toBe(2);
    expect((int) $row->active_days)->toBe(2);
    expect((float) $row->requests_per_active_day)->toBe(1.0);
    expect((int) $row->forfeited_count)->toBe(1);
    expect((float) $row->forfeit_rate)->toBe(50.0);
});

test('processingTime by_admin excludes forfeited requests from the count when archived', function () {
    $fixtures = seedAnalyticsFixtures();

    $forfeitedStatus = RequestStatus::firstOrCreate(
        ['status_id' => RequestStatusEnum::Forfeited->value],
        ['status_name' => 'Forfeited']
    );

    // A forfeited request that was later archived should not count toward
    // forfeited_count/forfeit_rate — same archive-exclusion rule as every
    // other panel in this file.
    $request = DocumentRequest::factory()->create([
        'user_id'            => $fixtures['student']->user_id,
        'status_id'          => $forfeitedStatus->status_id,
        'request_purpose_id' => $fixtures['purpose']->request_purpose_id,
        'requested_at'       => now(),
    ]);
    DB::table('request_document')->insert([
        'request_id'       => $request->request_id,
        'document_type_id' => $fixtures['docType']->document_type_id,
        'number_of_copies' => 1,
    ]);
    DB::table('request_history')->insert([
        'request_id'         => $request->request_id,
        'old_status_id'      => RequestStatusEnum::ReadyToClaim->value,
        'new_status_id'      => $forfeitedStatus->status_id,
        'changed_at'         => now(),
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => 60,
        'business_minutes'   => 60,
    ]);
    DB::table('document_request')
        ->where('request_id', $request->request_id)
        ->update(['is_archived' => true, 'archived_on' => now()]);

    $range  = [now()->subDay(), now()->addDay()];
    $result = (new AnalyticsService())->processingTime($range);

    // The admin has no non-archived requests in range at all, so by_admin
    // should have no row for them (whereNotNull/exclusion drops the group
    // entirely rather than reporting a phantom 0-request row).
    expect($result['by_admin'])->toHaveCount(0);
});

test('signatureTurnaroundTime excludes archived requests', function () {
    $fixtures = seedAnalyticsFixtures();

    // document_request.status_id has a FK to request_status — PendingSignature
    // (status_id 6) isn't seeded by seedAnalyticsFixtures() (which only seeds
    // Completed), so it needs its own row here.
    RequestStatus::firstOrCreate(
        ['status_id' => RequestStatusEnum::PendingSignature->value],
        ['status_name' => 'Pending Signature']
    );

    $active = DocumentRequest::factory()->create([
        'user_id'            => $fixtures['student']->user_id,
        'status_id'          => RequestStatusEnum::PendingSignature->value,
        'request_purpose_id' => $fixtures['purpose']->request_purpose_id,
        'requested_at'       => now(),
    ]);
    DB::table('request_document')->insert([
        'request_id'       => $active->request_id,
        'document_type_id' => $fixtures['docType']->document_type_id,
        'number_of_copies' => 1,
    ]);
    DB::table('request_history')->insert([
        'request_id'         => $active->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => RequestStatusEnum::PendingSignature->value,
        'changed_at'         => now(),
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => 15,
        'business_minutes'   => 15,
    ]);

    $archived = DocumentRequest::factory()->create([
        'user_id'            => $fixtures['student']->user_id,
        'status_id'          => RequestStatusEnum::PendingSignature->value,
        'request_purpose_id' => $fixtures['purpose']->request_purpose_id,
        'requested_at'       => now(),
    ]);
    DB::table('request_document')->insert([
        'request_id'       => $archived->request_id,
        'document_type_id' => $fixtures['docType']->document_type_id,
        'number_of_copies' => 1,
    ]);
    DB::table('request_history')->insert([
        'request_id'         => $archived->request_id,
        'old_status_id'      => RequestStatusEnum::Processing->value,
        'new_status_id'      => RequestStatusEnum::PendingSignature->value,
        'changed_at'         => now(),
        'changed_by'         => $fixtures['admin']->user_id,
        'processed_by_email' => $fixtures['admin']->email,
        'minutes_processed'  => 800,
        'business_minutes'   => 800,
    ]);
    DB::table('document_request')
        ->where('request_id', $archived->request_id)
        ->update(['is_archived' => true, 'archived_on' => now()]);

    $range  = [now()->subDay(), now()->addDay()];
    $result = (new AnalyticsService())->signatureTurnaroundTime($range);

    expect($result['registrar_time'])->toHaveCount(1);
    expect((float) $result['registrar_time'][0]->avg_minutes)->toBe(15.0);
});

test('overview avg_processing_minutes excludes archived requests and uses business_minutes', function () {
    $fixtures = seedAnalyticsFixtures();

    createRequestWithHistory($fixtures, archived: false, businessMinutes: 40, minutesProcessed: 7777);
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 999, minutesProcessed: 999);

    $range = [now()->subDay(), now()->addDay()];
    $result = (new AnalyticsService())->overview($range);

    expect((float) $result['avg_processing_minutes'])->toBe(40.0);
});

/**
 * Lightweight cross-panel consistency check, per the plan's Step 1.0.1
 * recommendation: converts "QA notices numbers look wrong three weeks
 * later" into "CI fails immediately when this regresses." Sums of
 * per-bucket panels must never exceed the unconditional overview() total
 * for the same range.
 */
test('cross-panel invariant: byStatus and byPurpose totals never exceed overview total', function () {
    $fixtures = seedAnalyticsFixtures();

    createRequestWithHistory($fixtures, archived: false, businessMinutes: 10, minutesProcessed: 10);
    createRequestWithHistory($fixtures, archived: false, businessMinutes: 15, minutesProcessed: 15);
    createRequestWithHistory($fixtures, archived: true, businessMinutes: 999, minutesProcessed: 999);

    $range = [now()->subDay(), now()->addDay()];
    $service = new AnalyticsService();

    $overviewTotal = $service->overview($range)['total'];
    $statusSum     = collect($service->byStatus($range))->sum('total');
    $purposeSum    = collect($service->byPurpose($range))->sum('total');

    expect($statusSum)->toBeLessThanOrEqual($overviewTotal);
    expect($purposeSum)->toBeLessThanOrEqual($overviewTotal);
    expect($overviewTotal)->toBe(2);
});