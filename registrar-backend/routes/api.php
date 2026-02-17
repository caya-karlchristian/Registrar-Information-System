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

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);


/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Login)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('system-users')->group(function () {
        Route::get('/', [SystemUserController::class, 'index']);
        Route::get('{id}', [SystemUserController::class, 'show']);
        Route::post('/', [SystemUserController::class, 'store']);
        Route::put('{id}', [SystemUserController::class, 'update']);
        Route::delete('{id}', [SystemUserController::class, 'destroy']);
    });

    Route::prefix('students')->group(function () {
        Route::get('/', [StudentProfileController::class, 'index']);
        Route::get('{id}', [StudentProfileController::class, 'show']);
        Route::post('/', [StudentProfileController::class, 'store']);
        Route::put('{id}', [StudentProfileController::class, 'update']);
        Route::delete('{id}', [StudentProfileController::class, 'destroy']);
    });

    Route::prefix('academic-records')->group(function () {
        Route::get('/', [StudentAcademicRecordController::class, 'index']);
        Route::get('{id}', [StudentAcademicRecordController::class, 'show']);
        Route::post('/', [StudentAcademicRecordController::class, 'store']);
        Route::put('{id}', [StudentAcademicRecordController::class, 'update']);
        Route::delete('{id}', [StudentAcademicRecordController::class, 'destroy']);
    });

    Route::prefix('request-statuses')->group(function () {
        Route::get('/', [RequestStatusController::class, 'index']);
        Route::get('{id}', [RequestStatusController::class, 'show']);
        Route::post('/', [RequestStatusController::class, 'store']);
        Route::put('{id}', [RequestStatusController::class, 'update']);
        Route::delete('{id}', [RequestStatusController::class, 'destroy']);
    });

    Route::prefix('document-types')->group(function () {
        Route::get('/', [DocumentTypeController::class, 'index']);
        Route::get('{id}', [DocumentTypeController::class, 'show']);
        Route::post('/', [DocumentTypeController::class, 'store']);
        Route::put('{id}', [DocumentTypeController::class, 'update']);
        Route::delete('{id}', [DocumentTypeController::class, 'destroy']);
    });

    Route::prefix('certifications')->group(function () {
        Route::get('/', [CertificationTypeController::class, 'index']);
        Route::get('{id}', [CertificationTypeController::class, 'show']);
        Route::post('/', [CertificationTypeController::class, 'store']);
        Route::put('{id}', [CertificationTypeController::class, 'update']);
        Route::delete('{id}', [CertificationTypeController::class, 'destroy']);
    });

    Route::prefix('document-requests')->group(function () {
        Route::get('/', [DocumentRequestController::class, 'index']);
        Route::get('{id}', [DocumentRequestController::class, 'show']);
        Route::post('/', [DocumentRequestController::class, 'store']);
        Route::put('{id}', [DocumentRequestController::class, 'update']);
        Route::delete('{id}', [DocumentRequestController::class, 'destroy']);
    });

    Route::prefix('request-documents')->group(function () {
        Route::get('/', [RequestDocumentController::class, 'index']);
        Route::get('{id}', [RequestDocumentController::class, 'show']);
        Route::post('/', [RequestDocumentController::class, 'store']);
        Route::put('{id}', [RequestDocumentController::class, 'update']);
        Route::delete('{id}', [RequestDocumentController::class, 'destroy']);
    });

    Route::prefix('request-history')->group(function () {
        Route::get('/', [RequestHistoryController::class, 'index']);
        Route::get('{id}', [RequestHistoryController::class, 'show']);
        Route::post('/', [RequestHistoryController::class, 'store']);
        Route::put('{id}', [RequestHistoryController::class, 'update']);
        Route::delete('{id}', [RequestHistoryController::class, 'destroy']);
    });

});
