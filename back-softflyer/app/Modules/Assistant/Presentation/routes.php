<?php

use App\Modules\Assistant\Presentation\Controllers\AssistantController;
use Illuminate\Support\Facades\Route;

// Asistente IA (spec 040): solo lectura, con el permiso de reportes y límite de uso.
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::post('/asistente/chat', [AssistantController::class, 'chat'])
        ->middleware(['permiso:reportes.ventas', 'throttle:asistente']);
});
