<?php

use App\Modules\Restaurant\Application\GetDashboardSummary;
use App\Modules\Restaurant\Presentation\Controllers\AnalyticsController;
use App\Modules\Restaurant\Presentation\Controllers\CategoryController;
use App\Modules\Restaurant\Presentation\Controllers\ChargeController;
use App\Modules\Restaurant\Presentation\Controllers\DiningRoomController;
use App\Modules\Restaurant\Presentation\Controllers\KitchenAccessController;
use App\Modules\Restaurant\Presentation\Controllers\KitchenController;
use App\Modules\Restaurant\Presentation\Controllers\InventoryController;
use App\Modules\Restaurant\Presentation\Controllers\MenuController;
use App\Modules\Restaurant\Presentation\Controllers\ModifierGroupController;
use App\Modules\Restaurant\Presentation\Controllers\OrderController;
use App\Modules\Restaurant\Presentation\Controllers\PreparationController;
use App\Modules\Restaurant\Presentation\Controllers\ProductController;
use App\Modules\Restaurant\Presentation\Controllers\PromotionController;
use App\Modules\Restaurant\Presentation\Controllers\StationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['inquilino', 'auth:sanctum', 'cuenta.vigente'])->group(function (): void {
    Route::get('/panel/resumen', fn (GetDashboardSummary $summary) => ['data' => $summary->handle()])
        ->middleware('permiso:panel.ver');

    // Analíticas de ventas (spec 039): solo quien puede ver reportes.
    Route::get('/analiticas', [AnalyticsController::class, 'index'])->middleware('permiso:reportes.ventas');

    // Carta (spec 002). Leer: cualquier usuario del restaurante. Escribir: productos.*
    Route::get('/carta', [MenuController::class, 'show']);
    Route::get('/carta/catalogos', [MenuController::class, 'catalogs']);

    Route::get('/categorias', [CategoryController::class, 'index']);
    Route::get('/productos', [ProductController::class, 'index']);
    Route::get('/productos/{product}', [ProductController::class, 'show']);
    Route::get('/estaciones', [StationController::class, 'index']);
    Route::get('/modificador-grupos', [ModifierGroupController::class, 'index']);

    // Promociones de la carta (spec 039). Leer: cualquier usuario del restaurante (igual que la carta).
    Route::get('/promociones', [PromotionController::class, 'index']);

    // Toda escritura exitosa de la carta avisa en tiempo real (spec 005).
    Route::middleware('notifica.carta')->group(function (): void {
        Route::post('/categorias', [CategoryController::class, 'store'])->middleware('permiso:productos.crear');
        Route::put('/categorias/orden', [CategoryController::class, 'reorder'])->middleware('permiso:productos.editar');
        Route::patch('/categorias/{category}', [CategoryController::class, 'update'])->middleware('permiso:productos.editar');
        Route::delete('/categorias/{category}', [CategoryController::class, 'destroy'])->middleware('permiso:productos.eliminar');

        Route::post('/productos', [ProductController::class, 'store'])->middleware('permiso:productos.crear');
        Route::patch('/productos/{product}', [ProductController::class, 'update'])->middleware('permiso:productos.editar');
        Route::delete('/productos/{product}', [ProductController::class, 'destroy'])->middleware('permiso:productos.eliminar');

        // Foto del plato (spec 023): subir, reemplazar o quitar.
        Route::post('/productos/{product}/imagen', [ProductController::class, 'uploadImage'])->middleware('permiso:productos.crear|productos.editar');
        Route::delete('/productos/{product}/imagen', [ProductController::class, 'destroyImage'])->middleware('permiso:productos.crear|productos.editar');

        Route::post('/estaciones', [StationController::class, 'store'])->middleware('permiso:productos.crear');
        Route::patch('/estaciones/{station}', [StationController::class, 'update'])->middleware('permiso:productos.editar');

        Route::post('/modificador-grupos', [ModifierGroupController::class, 'store'])->middleware('permiso:productos.crear');
        Route::patch('/modificador-grupos/{group}', [ModifierGroupController::class, 'update'])->middleware('permiso:productos.editar');
        Route::delete('/modificador-grupos/{group}', [ModifierGroupController::class, 'destroy'])->middleware('permiso:productos.eliminar');

        // Promociones (spec 039): cada cambio refresca la carta del mozo.
        Route::post('/promociones', [PromotionController::class, 'store'])->middleware('permiso:productos.crear');
        Route::patch('/promociones/{promotion}', [PromotionController::class, 'update'])->middleware('permiso:productos.editar');
        Route::delete('/promociones/{promotion}', [PromotionController::class, 'destroy'])->middleware('permiso:productos.eliminar');
    });

    // Salones y plano (spec 003). Leer: cualquier usuario del restaurante. Escribir: restaurante.plano.editar
    Route::get('/salones', [DiningRoomController::class, 'index']);
    Route::post('/salones', [DiningRoomController::class, 'store'])->middleware('permiso:restaurante.plano.editar');
    Route::put('/salones/orden', [DiningRoomController::class, 'reorder'])->middleware('permiso:restaurante.plano.editar');
    Route::patch('/salones/{room}', [DiningRoomController::class, 'update'])->middleware('permiso:restaurante.plano.editar');
    Route::delete('/salones/{room}', [DiningRoomController::class, 'destroy'])->middleware('permiso:restaurante.plano.editar');
    Route::get('/salones/{room}/plano', [DiningRoomController::class, 'showPlan']);
    Route::put('/salones/{room}/plano', [DiningRoomController::class, 'savePlan'])->middleware('permiso:restaurante.plano.editar');

    // Pedidos del mozo (spec 006). Abrir y enviar a cocina son idempotentes (Doc. 07 §5).
    Route::get('/pedidos', [OrderController::class, 'index'])->middleware('permiso:restaurante.pedidos.crear|panel.ver');
    // Cobro (spec 009): el cajero ve los pedidos por cobrar y cada uno por separado.
    Route::get('/pedidos/por-cobrar', [ChargeController::class, 'index'])->middleware('permiso:ventas.crear');
    Route::post('/pedidos/{order}/cobro', [ChargeController::class, 'store'])->middleware(['permiso:ventas.crear', 'idempotente']);
    Route::get('/pedidos/{order}', [OrderController::class, 'show'])->middleware('permiso:restaurante.pedidos.crear|panel.ver|ventas.crear');
    Route::post('/pedidos', [OrderController::class, 'store'])->middleware(['permiso:restaurante.pedidos.crear', 'idempotente']);
    Route::post('/pedidos/{order}/comandas', [OrderController::class, 'send'])->middleware(['permiso:restaurante.pedidos.crear', 'idempotente']);
    Route::post('/pedidos/{order}/detalles/{item}/anular', [OrderController::class, 'voidItem'])->middleware('permiso:restaurante.pedidos.anular_item');
    Route::post('/pedidos/{order}/cuenta', [OrderController::class, 'requestBill'])->middleware('permiso:restaurante.pedidos.crear');
    Route::post('/pedidos/{order}/reabrir', [OrderController::class, 'reopen'])->middleware('permiso:restaurante.pedidos.crear');
    Route::post('/pedidos/{order}/anular', [OrderController::class, 'cancel'])->middleware('permiso:restaurante.pedidos.crear');

    // Cocina (spec 007). El mozo solo puede marcar "entregado"; lo afina KitchenBoard.
    Route::get('/cocina/estaciones', [KitchenAccessController::class, 'stations'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');
    Route::get('/cocina/accesos/{user}', [KitchenAccessController::class, 'show'])->middleware('permiso:usuarios.editar');
    Route::put('/cocina/accesos/{user}', [KitchenAccessController::class, 'update'])->middleware('permiso:usuarios.editar');
    Route::get('/cocina/comandas', [KitchenController::class, 'index'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');
    Route::patch('/cocina/detalles/{item}', [KitchenController::class, 'updateItem'])->middleware('permiso:restaurante.cocina.actualizar_estado|restaurante.pedidos.crear');
    Route::post('/cocina/comandas/{ticket}/listo', [KitchenController::class, 'ticketReady'])->middleware('permiso:restaurante.cocina.actualizar_estado');
    Route::post('/cocina/comandas/{ticket}/impresa', [KitchenController::class, 'printed'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');

    // Preparación (spec 031): recetas operativas filtradas por la misma estación del KDS.
    Route::get('/preparaciones', [PreparationController::class, 'index'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');
    Route::get('/preparaciones/{product}', [PreparationController::class, 'show'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');
    Route::put('/preparaciones/{product}', [PreparationController::class, 'update'])->middleware('permiso:restaurante.cocina.actualizar_estado|panel.ver');

    // Inventario (spec 014): admin ve todo; Cocina/Barra solo sus almacenes KDS.
    Route::get('/inventario', [InventoryController::class, 'index'])->middleware('permiso:inventario.ver');
    Route::get('/inventario/catalogos', [InventoryController::class, 'catalogs'])->middleware('permiso:inventario.ver');
    Route::get('/inventario/kardex', [InventoryController::class, 'ledger'])->middleware('permiso:inventario.ver');
    Route::post('/inventario/articulos', [InventoryController::class, 'storeItem'])->middleware('permiso:inventario.administrar');
    Route::patch('/inventario/articulos/{product}', [InventoryController::class, 'updateItem'])->middleware('permiso:inventario.administrar');
    Route::post('/inventario/movimientos', [InventoryController::class, 'movement'])->middleware(['permiso:inventario.ajustar', 'idempotente']);
    Route::post('/inventario/conteos', [InventoryController::class, 'count'])->middleware(['permiso:inventario.ajustar', 'idempotente']);
});
