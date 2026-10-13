<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Catálogo global de métodos de pago (spec 009). Cualquier usuario que cobre lo necesita.
Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->get('/metodos-pago', fn () => ['data' => DB::table('metodos_pago')
    ->where('es_activo', true)
    ->orderBy('id')
    ->get(['id', 'codigo', 'nombre', 'es_efectivo'])
    ->map(fn ($method) => ['id' => (int) $method->id, 'codigo' => $method->codigo, 'nombre' => $method->nombre, 'es_efectivo' => (bool) $method->es_efectivo])
    ->all()])->middleware('permiso:ventas.crear');
