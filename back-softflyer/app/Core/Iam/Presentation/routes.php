<?php

use App\Core\Iam\Presentation\Controllers\AttendanceController;
use App\Core\Iam\Presentation\Controllers\AuthController;
use App\Core\Iam\Presentation\Controllers\ChannelAuthController;
use App\Core\Iam\Presentation\Controllers\TeamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::middleware('inquilino')->prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/yo', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        // El PIN solo cambia de usuario en un dispositivo con sesion abierta (spec 004).
        Route::post('/pin', [AuthController::class, 'pin'])->middleware(['cuenta.vigente', 'throttle:30,1']);
    });
});

// Autorizacion de canales privados en tiempo real (spec 005), dentro del inquilino del subdominio.
Route::middleware(['inquilino', 'auth:sanctum'])->group(function (): void {
    Route::post('/broadcasting/auth', fn (Request $request) => Broadcast::auth($request));
    // Todos los canales de un dispositivo en una sola peticion (spec 008).
    Route::post('/broadcasting/auth/lote', [ChannelAuthController::class, 'batch']);
});

// Equipo del restaurante (spec 004).
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::get('/roles', [TeamController::class, 'roles']);
    Route::get('/equipo/cambio', [TeamController::class, 'switchable']);

    Route::get('/usuarios', [TeamController::class, 'index'])->middleware('permiso:usuarios.editar');
    Route::post('/usuarios', [TeamController::class, 'store'])->middleware('permiso:usuarios.crear');
    Route::patch('/usuarios/{user}', [TeamController::class, 'update'])->middleware('permiso:usuarios.editar');
    Route::put('/usuarios/{user}/pin', [TeamController::class, 'setPin'])->middleware('permiso:usuarios.editar');
    Route::delete('/usuarios/{user}/pin', [TeamController::class, 'removePin'])->middleware('permiso:usuarios.editar');

    Route::get('/asistencia/mi-jornada', [AttendanceController::class, 'myDay'])->middleware('permiso:asistencia.marcar');
    Route::post('/asistencia/marcaciones', [AttendanceController::class, 'mark'])->middleware(['permiso:asistencia.marcar', 'idempotente']);
    Route::get('/asistencia/resumen', [AttendanceController::class, 'summary'])->middleware('permiso:asistencia.administrar');
    Route::get('/asistencia/horarios/{user}', [AttendanceController::class, 'schedule'])->middleware('permiso:asistencia.administrar');
    Route::put('/asistencia/horarios/{user}', [AttendanceController::class, 'saveSchedule'])->middleware('permiso:asistencia.administrar');
});
