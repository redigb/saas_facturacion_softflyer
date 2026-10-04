<?php

use App\Modules\Restaurant\Application\GetDashboardSummary;
use Illuminate\Support\Facades\Route;

Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::get('/panel/resumen', fn (GetDashboardSummary $summary) => ['data' => $summary->handle()])
        ->middleware('permiso:panel.ver');
});
