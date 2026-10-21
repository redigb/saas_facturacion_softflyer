<?php

namespace App\Providers;

use App\Core\Billing\Application\SunatGateway;
use App\Core\Billing\Infrastructure\Greenter\GreenterGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SunatGateway::class, GreenterGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
