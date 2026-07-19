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
});
