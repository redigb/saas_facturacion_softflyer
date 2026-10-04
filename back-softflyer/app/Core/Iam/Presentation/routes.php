<?php

use App\Core\Iam\Presentation\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('inquilino')->prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/yo', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
