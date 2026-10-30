<?php

use App\Core\Billing\Presentation\Controllers\FiscalConfigurationController;
use App\Core\Billing\Presentation\Controllers\ReceiptController;
use Illuminate\Support\Facades\Route;

// Comprobantes (spec 010 y spec 037).
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->prefix('comprobantes')->group(function (): void {
    // Spec 037: la pantalla "Facturación" y las descargas (antes que /{receipt}, que las atraparía).
    Route::middleware('permiso:comprobantes.emitir')->group(function (): void {
        Route::get('/historial', [ReceiptController::class, 'history']);
        Route::get('/{receipt}/xml', [ReceiptController::class, 'xml']);
        Route::get('/{receipt}/cdr', [ReceiptController::class, 'cdr']);
    });

    Route::middleware('permiso:ventas.crear')->group(function (): void {
        Route::get('/', [ReceiptController::class, 'index']);
        Route::get('/{receipt}', [ReceiptController::class, 'show']);
    });
});

// Configuración fiscal (spec 017a): el dueño solo la lee. Cargarla es del backoffice (plataforma/clientes/{slug}/fiscal).
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente', 'permiso:configuracion.empresa'])->group(function (): void {
    Route::get('/configuracion-fiscal', [FiscalConfigurationController::class, 'show']);
});
