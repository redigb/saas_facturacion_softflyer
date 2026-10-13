<?php

use App\Core\Billing\Presentation\Controllers\ReceiptController;
use Illuminate\Support\Facades\Route;

// Comprobantes (spec 010). Hoy simulados; la emisión real con Greenter llega después.
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente', 'permiso:ventas.crear'])->prefix('comprobantes')->group(function (): void {
    Route::get('/', [ReceiptController::class, 'index']);
    Route::get('/{receipt}', [ReceiptController::class, 'show']);
});
