<?php

use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Core\Tenancy\Presentation\Controllers\ConfigurationController;
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

// Empresa y sucursales (spec 011). Leer y escribir: configuracion.empresa / configuracion.sucursales.
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::get('/empresa', [ConfigurationController::class, 'company'])->middleware('permiso:configuracion.empresa');
    Route::patch('/empresa', [ConfigurationController::class, 'updateCompany'])->middleware('permiso:configuracion.empresa');

    Route::get('/sucursales', [ConfigurationController::class, 'branches'])->middleware('permiso:configuracion.sucursales');
    Route::post('/sucursales', [ConfigurationController::class, 'storeBranch'])->middleware('permiso:configuracion.sucursales');
    Route::patch('/sucursales/{branch}', [ConfigurationController::class, 'updateBranch'])->middleware('permiso:configuracion.sucursales');

    // Catálogo global de distritos para los selectores.
    Route::get('/ubigeos', [ConfigurationController::class, 'ubigeos']);
});
