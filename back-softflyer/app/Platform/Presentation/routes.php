<?php

use App\Platform\Presentation\Controllers\ClientController;
use App\Platform\Presentation\Controllers\PlatformAuthController;
use App\Platform\Presentation\Middleware\EnsurePlatformHost;
use Illuminate\Support\Facades\Route;

// Backoffice del dueno de la plataforma: solo en admin.{dominio} y con su propio guard.
Route::prefix('plataforma')->middleware(EnsurePlatformHost::class)->group(function (): void {
    Route::post('/auth/login', [PlatformAuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:plataforma')->group(function (): void {
        Route::get('/auth/yo', [PlatformAuthController::class, 'me']);
        Route::post('/auth/logout', [PlatformAuthController::class, 'logout']);

        Route::get('/resumen', [ClientController::class, 'overview']);
        Route::get('/planes', [ClientController::class, 'plans']);
        Route::get('/clientes', [ClientController::class, 'index']);
        Route::post('/clientes', [ClientController::class, 'store']);
        Route::get('/clientes/{slug}', [ClientController::class, 'show']);
        Route::patch('/clientes/{slug}', [ClientController::class, 'update']);
        Route::post('/clientes/{slug}/cancelar', [ClientController::class, 'cancel']);
        Route::post('/clientes/{slug}/activar-plan', [ClientController::class, 'activatePlan']);
        Route::post('/clientes/{slug}/extender-prueba', [ClientController::class, 'extendTrial']);
        Route::post('/clientes/{slug}/suspender', [ClientController::class, 'suspend']);
        Route::post('/clientes/{slug}/reactivar', [ClientController::class, 'reactivate']);
        Route::post('/clientes/{slug}/homologacion', [ClientController::class, 'setHomologation']);
        Route::post('/clientes/{slug}/fiscal/certificado', [ClientController::class, 'uploadCertificate']);
        Route::put('/clientes/{slug}/fiscal/credenciales-sol', [ClientController::class, 'saveSolCredentials']);
        Route::get('/alertas', [ClientController::class, 'alerts']);
        Route::post('/clientes/{slug}/fiscal/probar-credenciales', [ClientController::class, 'testCredentials']);
        Route::put('/clientes/{slug}/fiscal/tasa-igv', [ClientController::class, 'setCompanyRate']);
        Route::patch('/clientes/{slug}/fiscal/sucursales/{branch}', [ClientController::class, 'setBranchTax'])->whereNumber('branch');
        Route::get('/solicitudes', [ClientController::class, 'pendingRegistrations']);
        Route::post('/solicitudes/{id}/reenviar', [ClientController::class, 'resendLink'])->whereNumber('id');
    });
});
