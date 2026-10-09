<?php

namespace App\Modules\Restaurant\Infrastructure;

use App\Modules\Restaurant\Presentation\Middleware\NotifyMenuChanged;
use Illuminate\Routing\Router;
use Illuminate\Support\ServiceProvider;

class RestaurantServiceProvider extends ServiceProvider
{
    public function boot(Router $router): void
    {
        $router->aliasMiddleware('notifica.carta', NotifyMenuChanged::class);

        // Canales en tiempo real del modulo (spec 005). En un provider y no en routes.php
        // para que existan aunque las rutas esten cacheadas.
        require app_path('Modules/Restaurant/Presentation/channels.php');
    }
}
