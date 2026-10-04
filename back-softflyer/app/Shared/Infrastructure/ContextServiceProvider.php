<?php

namespace App\Shared\Infrastructure;

use Illuminate\Support\ServiceProvider;

/**
 * Cada contexto de Core/, Modules/ y Platform/ trae sus propias migraciones.
 */
class ContextServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(array_merge(
            glob(app_path('Core/*/Infrastructure/Database/Migrations'), GLOB_ONLYDIR) ?: [],
            glob(app_path('Modules/*/Infrastructure/Database/Migrations'), GLOB_ONLYDIR) ?: [],
            [app_path('Platform/Infrastructure/Database/Migrations')],
        ));
    }
}
