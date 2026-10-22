<?php

use App\Core\Cash\Presentation\Controllers\CashSessionController;
use Illuminate\Support\Facades\Route;

// Turnos de caja (spec 009). Cada operación valida permiso, sucursal y que el turno sea del usuario.
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->prefix('sesiones-caja')->group(function (): void {
    Route::get('/actual', [CashSessionController::class, 'current'])->middleware('permiso:caja.abrir');
    Route::get('/historial', [CashSessionController::class, 'history'])->middleware('permiso:caja.ver_movimientos');
    Route::post('/', [CashSessionController::class, 'open'])->middleware('permiso:caja.abrir');
    Route::get('/{cashSession}/resumen', [CashSessionController::class, 'summary'])->middleware('permiso:caja.ver_movimientos');
    Route::post('/{cashSession}/movimientos', [CashSessionController::class, 'addMovement'])->middleware('permiso:caja.registrar_movimiento_manual');
    Route::post('/{cashSession}/cierre', [CashSessionController::class, 'close'])->middleware('permiso:caja.cerrar');
});
