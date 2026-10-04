<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/hello', function () {
        return response()->json([
            'data' => [
                'message' => 'Hello World desde Laravel 12',
                'service' => 'Softflyer API',
            ],
        ]);
    });

    // Cada contexto expone sus rutas en Presentation/routes.php.
    $routeFiles = array_merge(
        glob(app_path('Core/*/Presentation/routes.php')) ?: [],
        glob(app_path('Modules/*/Presentation/routes.php')) ?: [],
        [app_path('Platform/Presentation/routes.php')],
    );

    foreach ($routeFiles as $routeFile) {
        require $routeFile;
    }
});
