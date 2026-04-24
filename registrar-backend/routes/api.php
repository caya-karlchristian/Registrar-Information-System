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
use App\Http\Controllers\AnnouncementController;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');

Route::post('/auth/callback', [SsoCallbackController::class, 'handle']);

Route::get('announcements',               [AnnouncementController::class, 'index']);
Route::get('announcements/{announcement}', [AnnouncementController::class, 'show']);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Broadcasting auth
    Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
        return \Illuminate\Support\Facades\Broadcast::auth($request);
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
        Route::get('{id}',                        [DocumentRequestController::class, 'show']);
        Route::post('/', [DocumentRequestController::class, 'store'])->middleware('role:1,2');
        Route::put('{documentRequest}',    [DocumentRequestController::class, 'update'])->middleware('role:3');
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
    Route::prefix('request-history')->group(function () {
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

    // Admin only (role 3 — superadmin bypasses via RoleMiddleware)
    Route::middleware('role:3')->group(function () {
        Route::post('document-types',          [DocumentTypeController::class, 'store']);
        Route::put('document-types/{id}',      [DocumentTypeController::class, 'update']);
        Route::delete('document-types/{id}',   [DocumentTypeController::class, 'destroy']);
        Route::post('certifications',          [CertificationTypeController::class, 'store']);
        Route::put('certifications/{id}',      [CertificationTypeController::class, 'update']);
        Route::delete('certifications/{id}',   [CertificationTypeController::class, 'destroy']);
        Route::put('certifications/{id}/layout',          [CertificationTypeController::class, 'updateLayout']);
        Route::post('certifications/{id}/layout/logo',    [CertificationTypeController::class, 'uploadLayoutLogo']);
        Route::post('request-statuses',        [RequestStatusController::class, 'store']);
        Route::put('request-statuses/{id}',    [RequestStatusController::class, 'update']);
        Route::delete('request-statuses/{id}', [RequestStatusController::class, 'destroy']);
        Route::apiResource('students',         StudentProfileController::class);
        Route::apiResource('academic-records', StudentAcademicRecordController::class);

        Route::prefix('analytics')->group(function () {
            Route::get('overview',         [AnalyticsController::class, 'overview']);
            Route::get('volume-trend',     [AnalyticsController::class, 'volumeTrend']);
            Route::get('by-document-type', [AnalyticsController::class, 'byDocumentType']);
            Route::get('by-status',        [AnalyticsController::class, 'byStatus']);
            Route::get('processing-time',  [AnalyticsController::class, 'processingTime']);
            Route::get('peak-hours',       [AnalyticsController::class, 'peakHours']);
            Route::get('by-purpose',       [AnalyticsController::class, 'byPurpose']);
        });
    });

    // Superadmin only (role 4)
    Route::middleware('role:4')->group(function () {
        Route::apiResource('system-users', SystemUserController::class);
        Route::get('audit-logs',         [AuditLogController::class, 'index']);
        Route::get('audit-logs/filters', [AuditLogController::class, 'filters']);
        Route::post('announcements',                      [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}',        [AnnouncementController::class, 'update']);
        Route::delete('announcements/{announcement}',     [AnnouncementController::class, 'destroy']);
    });
});
