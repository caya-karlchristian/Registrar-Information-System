<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentRequestController;

Route::post('/requests', [StudentRequestController::class, 'store']);
