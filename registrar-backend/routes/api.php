<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SystemUserController;
use App\Http\Controllers\StudentProfileController;
use App\Http\Controllers\StudentAcademicRecordController;
use App\Http\Controllers\RequestStatusController;
use App\Http\Controllers\DocumentTypeController;
use App\Http\Controllers\CertificationTypeController;
use App\Http\Controllers\DocumentRequestController;
use App\Http\Controllers\RequestDocumentController;
use App\Http\Controllers\RequestHistoryController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\SsoCallbackController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AiQueryController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\RequestPurposeController;
use App\Http\Controllers\AlumniSystemController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\PolicyController;
use App\Http\Controllers\AccessRequestController;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:60,1');

Route::post('/auth/callback', [SsoCallbackController::class, 'handle'])
    ->middleware('throttle:20,1');

Route::get('announcements',               [AnnouncementController::class, 'index']);
Route::get('announcements/{announcement}', [AnnouncementController::class, 'show']);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/
// General authenticated endpoints: 60 requests per minute.
// Analytics endpoints get a tighter limit (10/min) because each call
// can trigger heavy DB aggregation or a paid Anthropic API call.
Route::middleware(['auth:sanctum', 'active', 'throttle:60,1'])->group(function () {

    // ── OGOS student data ────────────────────────────────────────────────────
    Route::prefix('students')->group(function () {
        Route::get('search',                    [StudentProfileController::class, 'search']);
        Route::get('{studentNumber}/ogos',      [StudentProfileController::class, 'showByStudentNumber']);
        Route::get('{studentNumber}/personal-info', [StudentProfileController::class, 'personalInfo']);
        Route::get('{studentNumber}/addresses', [StudentProfileController::class, 'addresses']);
    });

    // ── Alumni System (PUPTAPS) integration ─────────────────────────────────────
    Route::prefix('alumni-system')->group(function () {
        Route::get('/',      [AlumniSystemController::class, 'index']);
        Route::get('/{id}',  [AlumniSystemController::class, 'show']);
    });

    // Auth
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Broadcasting auth
    // Resolve the sanctum user once before passing to Broadcast::auth().
    // Using setUserResolver(fn() => $request->user('sanctum')) causes infinite
    // recursion because Broadcast::auth() calls $request->user() internally,
    // which re-invokes the resolver, which calls $request->user() again, etc.
    Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
        $user = $request->user('sanctum');
        return \Illuminate\Support\Facades\Broadcast::auth(
            $request->setUserResolver(fn () => $user)
        );
    });

    // Notifications — all roles, own records only
    Route::prefix('notifications')->group(function () {
        Route::get('/',            [NotificationController::class, 'index']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('read-all',    [NotificationController::class, 'markAllAsRead']);
        Route::post('{id}/read',   [NotificationController::class, 'markAsRead']);
        Route::delete('{id}',      [NotificationController::class, 'destroy']);
    });

    // Document requests
    Route::prefix('document-requests')->group(function () {
        Route::get('/',                           [DocumentRequestController::class, 'index']);
        Route::get('logbook',                     [DocumentRequestController::class, 'logbook'])->middleware(['role:3,4', 'module:logbook']);
        Route::get('counts',                      [DocumentRequestController::class, 'counts'])->middleware('role:3,4');
        Route::post('archive-bulk',                [DocumentRequestController::class, 'archiveBulk'])->middleware('role:3');
        Route::post('restore-bulk',                [DocumentRequestController::class, 'restoreBulk'])->middleware('role:3');
        Route::get('{documentRequest}', [DocumentRequestController::class, 'show']);
        Route::post('/', [DocumentRequestController::class, 'store'])->middleware('role:1,2');
        Route::put('{documentRequest}',    [DocumentRequestController::class, 'update'])->middleware('role:3');
        Route::patch('{documentRequest}/archive', [DocumentRequestController::class, 'archive'])->middleware('role:3');
        Route::patch('{documentRequest}/restore', [DocumentRequestController::class, 'restore'])->middleware('role:3');
        Route::delete('{documentRequest}', [DocumentRequestController::class, 'destroy'])->middleware('role:3');
    });

    // Request documents (line-items)
    Route::prefix('request-documents')->group(function () {
        Route::get('/',     [RequestDocumentController::class, 'index']);
        Route::get('{id}',  [RequestDocumentController::class, 'show']);
        Route::post('/',    [RequestDocumentController::class, 'store'])->middleware('role:1,2');
        Route::put('{id}',  [RequestDocumentController::class, 'update'])->middleware('role:3');
        Route::delete('{id}', [RequestDocumentController::class, 'destroy'])->middleware('role:3');
    });

    // Request history — READ ONLY. History is written only by DocumentRequestService.
    Route::middleware(['role:3,4', 'module:logbook'])->prefix('request-history')->group(function () {
        Route::get('/',    [RequestHistoryController::class, 'index']);
        Route::get('{id}', [RequestHistoryController::class, 'show']);
    });

    // Read-only reference data — all authenticated roles
    Route::get('document-types',             [DocumentTypeController::class, 'index']);
    Route::get('document-types/{id}',        [DocumentTypeController::class, 'show']);
    Route::get('certifications',             [CertificationTypeController::class, 'index']);
    Route::get('certifications/layouts',     [CertificationTypeController::class, 'layouts']);
    Route::get('certifications/{id}',        [CertificationTypeController::class, 'show']);
    Route::get('request-statuses',           [RequestStatusController::class, 'index']);
    Route::get('request-statuses/{id}',      [RequestStatusController::class, 'show']);
    Route::get('request-purposes',      [RequestPurposeController::class, 'index']);
    Route::get('request-purposes/{id}', [RequestPurposeController::class, 'show']);
    Route::get('programs', [ProgramController::class, 'index']);

    // Admin only (role 3 — superadmin bypasses via RoleMiddleware)
    Route::middleware('role:3')->group(function () {
        Route::post('document-types',              [DocumentTypeController::class, 'store']);
        Route::put('document-types/{id}',          [DocumentTypeController::class, 'update']);
        Route::delete('document-types/{id}',       [DocumentTypeController::class, 'destroy']);
        Route::patch('document-types/{id}/archive', [DocumentTypeController::class, 'archive']);
        Route::patch('document-types/{id}/restore', [DocumentTypeController::class, 'restore']);
        Route::post('certifications',              [CertificationTypeController::class, 'store']);
        Route::put('certifications/{id}',          [CertificationTypeController::class, 'update']);
        Route::delete('certifications/{id}',       [CertificationTypeController::class, 'destroy']);
        Route::patch('certifications/{id}/archive', [CertificationTypeController::class, 'archive']);
        Route::patch('certifications/{id}/restore', [CertificationTypeController::class, 'restore']);
        Route::put('certifications/{id}/layout',          [CertificationTypeController::class, 'updateLayout']);
        Route::post('certifications/{id}/layout/logo',    [CertificationTypeController::class, 'uploadLayoutLogo']);
        Route::post('request-statuses',        [RequestStatusController::class, 'store']);
        Route::put('request-statuses/{id}',    [RequestStatusController::class, 'update']);
        Route::delete('request-statuses/{id}', [RequestStatusController::class, 'destroy']);
        Route::apiResource('students',         StudentProfileController::class);
        Route::apiResource('academic-records', StudentAcademicRecordController::class);

        Route::prefix('analytics')->middleware(['throttle:60,1', 'module:analytics'])->group(function () {
            Route::get('overview',         [AnalyticsController::class, 'overview']);
            Route::get('volume-trend',     [AnalyticsController::class, 'volumeTrend']);
            Route::get('by-document-type', [AnalyticsController::class, 'byDocumentType']);
            Route::get('by-status',        [AnalyticsController::class, 'byStatus']);
            Route::get('processing-time',  [AnalyticsController::class, 'processingTime']);
            Route::get('peak-hours',       [AnalyticsController::class, 'peakHours']);
            Route::get('by-purpose',       [AnalyticsController::class, 'byPurpose']);
            Route::post('ai-report', [AnalyticsController::class, 'aiReport'])
                ->middleware('throttle:30,1');
            // Phase 3 — Conversational NLQ
            Route::post('ai-query', [AiQueryController::class, 'query'])
                ->middleware('throttle:30,1');
        });

        Route::post('request-purposes',        [RequestPurposeController::class, 'store']);
        Route::put('request-purposes/{id}',    [RequestPurposeController::class, 'update']);
        Route::delete('request-purposes/{id}', [RequestPurposeController::class, 'destroy']);
    });

    // Superadmin only (role 4)
    Route::middleware('role:4')->group(function () {
        // Admin creation gets its own dedicated, tighter throttle on top of
        // the group's throttle:60,1 — this is now the primary defense
        // against bulk/automated admin creation (see IdpClient::createUser()
        // docblock re: x-api-key-only auth on the IdP side).
        Route::apiResource('system-users', SystemUserController::class)->except(['store']);
        Route::post('system-users', [SystemUserController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('system-users.store');

        Route::patch('system-users/{id}/policy', [SystemUserController::class, 'attachPolicy']);

        // User Management — Policy Attachment: reusable admin permission
        // policies, plus attaching one to a specific admin above.
        // NOTE: GET (read) is intentionally NOT here — see below. Only
        // create/edit/delete of a policy is Super-Admin-only.
        Route::post('policies',          [PolicyController::class, 'store']);
        Route::put('policies/{id}',      [PolicyController::class, 'update']);
        Route::delete('policies/{id}',   [PolicyController::class, 'destroy']);

        Route::get('audit-logs',         [AuditLogController::class, 'index']);
        Route::get('audit-logs/filters', [AuditLogController::class, 'filters']);
        Route::post('announcements',                      [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}',        [AnnouncementController::class, 'update']);
        Route::delete('announcements/{announcement}',     [AnnouncementController::class, 'destroy']);
        Route::patch('announcements/{id}/archive',        [AnnouncementController::class, 'archive']);
        Route::patch('announcements/{id}/restore',        [AnnouncementController::class, 'restore']);
    });

    // GET /policies (read-only): needed by any admin who can submit an
    // access request — RequestAccessPage.jsx's "Requested Policy" dropdown
    // — not just Super Admins managing policies. Deliberately gated the
    // same way as POST /access-requests below, not left wide open to every
    // authenticated role. Mutating a policy (create/edit/delete, above)
    // stays Super-Admin-only.
    Route::get('policies', [PolicyController::class, 'index'])
        ->middleware(['role:3,4', 'module:access_requests']);

    // Self-service access requests: delegated intake, centralized approval.
    // store() is available to any admin with the 'access_requests' module
    // (not just super admins) — everything else is super-admin-only, since
    // approval is what actually creates a SystemUser row.
    Route::prefix('access-requests')->group(function () {
        Route::post('/', [AccessRequestController::class, 'store'])
            ->middleware(['role:3,4', 'module:access_requests']);

        Route::middleware('role:4')->group(function () {
            Route::get('/',                     [AccessRequestController::class, 'index']);
            Route::post('{accessRequest}/approve', [AccessRequestController::class, 'approve']);
            Route::post('{accessRequest}/reject',  [AccessRequestController::class, 'reject']);
        });
    });
});
/*
|--------------------------------------------------------------------------
| LOCAL AUTH ROUTES  (added by apply_local_auth.py)
|--------------------------------------------------------------------------
| POST /api/auth/local-login         — always local, bypasses IDP
| POST /api/auth/local-password      — superadmin: set a user's local pwd
| GET  /api/auth/local-auth-status   — superadmin: list local-auth coverage
*/
use App\Http\Controllers\LocalAuthController;

Route::post('/auth/local-login', [LocalAuthController::class, 'login'])
    ->middleware('throttle:60,1');

Route::middleware(['auth:sanctum', 'active', 'role:4'])->group(function () {
    Route::post('/auth/local-password',    [LocalAuthController::class, 'setPassword']);
    Route::get('/auth/local-auth-status',  [LocalAuthController::class, 'status']);
});