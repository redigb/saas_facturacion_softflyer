<?php

use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Core\Tenancy\Presentation\Controllers\TrialController;
use App\Core\Tenancy\Presentation\Resources\TenantResource;
use Illuminate\Support\Facades\Route;

// Publico: el login lo usa para mostrar la empresa y si es una cuenta demo.
Route::middleware('inquilino')->get('/inquilino', function (TenantContext $context) {
    return new TenantResource($context->tenant());
});

// Prueba gratis: dominio central, sin inquilino todavia.
Route::prefix('registro')->group(function (): void {
    Route::post('/', [TrialController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/verificar', [TrialController::class, 'verify'])->middleware('throttle:10,1');
    Route::post('/reenviar', [TrialController::class, 'resend'])->middleware('throttle:3,1');
});
