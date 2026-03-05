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
use Illuminate\Http\Request;

Route::options('{any}', function () {
    return response()->json([], 200);
})->where('any', '.*');
/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Authentication)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum'], 'throttle:10,1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | AUTH USER ROUTES
    |--------------------------------------------------------------------------
    */

    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT REQUESTS (Students + Alumni + Admin)
    |--------------------------------------------------------------------------
    */

    Route::prefix('document-requests')->group(function () {

        Route::get('/', [DocumentRequestController::class, 'index']);

        Route::post('/', [DocumentRequestController::class, 'store'])
            ->middleware([\App\Http\Middleware\RoleMiddleware::class . ':1,2']);

        Route::get('{id}', [DocumentRequestController::class, 'show']);

        Route::put('{id}', [DocumentRequestController::class, 'update'])
            ->middleware([\App\Http\Middleware\RoleMiddleware::class . ':3']);

        Route::delete('{id}', [DocumentRequestController::class, 'destroy'])
            ->middleware([\App\Http\Middleware\RoleMiddleware::class . ':3']);

    });

    /*
    |--------------------------------------------------------------------------
    | REQUEST DOCUMENTS
    |--------------------------------------------------------------------------
    */

    Route::prefix('request-documents')->group(function () {
        Route::get('/', [RequestDocumentController::class, 'index']);
        Route::get('{id}', [RequestDocumentController::class, 'show']);
        Route::post('/', [RequestDocumentController::class, 'store']);
        Route::put('{id}', [RequestDocumentController::class, 'update']);
        Route::delete('{id}', [RequestDocumentController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | REQUEST HISTORY
    |--------------------------------------------------------------------------
    */

    Route::prefix('request-history')->group(function () {
        Route::get('/', [RequestHistoryController::class, 'index']);
        Route::get('{id}', [RequestHistoryController::class, 'show']);
        Route::post('/', [RequestHistoryController::class, 'store']);
        Route::put('{id}', [RequestHistoryController::class, 'update']);
        Route::delete('{id}', [RequestHistoryController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | ADMIN ONLY ROUTES
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:3')->group(function () {

        Route::apiResource('system-users', SystemUserController::class);

        Route::apiResource('students', StudentProfileController::class);

        Route::apiResource('academic-records', StudentAcademicRecordController::class);

        Route::apiResource('request-statuses', RequestStatusController::class);

        
        Route::apiResource('certifications', CertificationTypeController::class);
        
        });
        
    Route::apiResource('document-types', DocumentTypeController::class);

    Route::get('/student/profile', function (Request $request) {
        $user = $request->user();

        if ($user->role_id !== \App\Models\SystemUser::ROLE_STUDENT) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->load(['studentProfile', 'academicRecord']);

        return response()->json($user);
    });
});