<?php

use App\Modules\Restaurant\Application\GetDashboardSummary;
use App\Modules\Restaurant\Presentation\Controllers\CategoryController;
use App\Modules\Restaurant\Presentation\Controllers\MenuController;
use App\Modules\Restaurant\Presentation\Controllers\ModifierGroupController;
use App\Modules\Restaurant\Presentation\Controllers\ProductController;
use App\Modules\Restaurant\Presentation\Controllers\StationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::get('/panel/resumen', fn (GetDashboardSummary $summary) => ['data' => $summary->handle()])
        ->middleware('permiso:panel.ver');

    // Carta (spec 002). Leer: cualquier usuario del restaurante. Escribir: productos.*
    Route::get('/carta', [MenuController::class, 'show']);
    Route::get('/carta/catalogos', [MenuController::class, 'catalogs']);

    Route::get('/categorias', [CategoryController::class, 'index']);
    Route::post('/categorias', [CategoryController::class, 'store'])->middleware('permiso:productos.crear');
    Route::put('/categorias/orden', [CategoryController::class, 'reorder'])->middleware('permiso:productos.editar');
    Route::patch('/categorias/{category}', [CategoryController::class, 'update'])->middleware('permiso:productos.editar');
    Route::delete('/categorias/{category}', [CategoryController::class, 'destroy'])->middleware('permiso:productos.eliminar');

    Route::get('/productos', [ProductController::class, 'index']);
    Route::get('/productos/{product}', [ProductController::class, 'show']);
    Route::post('/productos', [ProductController::class, 'store'])->middleware('permiso:productos.crear');
    Route::patch('/productos/{product}', [ProductController::class, 'update'])->middleware('permiso:productos.editar');
    Route::delete('/productos/{product}', [ProductController::class, 'destroy'])->middleware('permiso:productos.eliminar');

    Route::get('/estaciones', [StationController::class, 'index']);
    Route::post('/estaciones', [StationController::class, 'store'])->middleware('permiso:productos.crear');
    Route::patch('/estaciones/{station}', [StationController::class, 'update'])->middleware('permiso:productos.editar');

    Route::get('/modificador-grupos', [ModifierGroupController::class, 'index']);
    Route::post('/modificador-grupos', [ModifierGroupController::class, 'store'])->middleware('permiso:productos.crear');
    Route::patch('/modificador-grupos/{group}', [ModifierGroupController::class, 'update'])->middleware('permiso:productos.editar');
    Route::delete('/modificador-grupos/{group}', [ModifierGroupController::class, 'destroy'])->middleware('permiso:productos.eliminar');
});
