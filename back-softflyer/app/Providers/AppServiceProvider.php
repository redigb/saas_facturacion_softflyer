<?php

namespace App\Providers;

use App\Core\Billing\Application\SunatGateway;
use App\Core\Billing\Infrastructure\Greenter\GreenterGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SunatGateway::class, GreenterGateway::class);

        // Un superusuario se salta RLS: con DB_ROLE la API trabaja como ese rol aunque la
        // conexión entre con postgres. Va en register(): algo puede conectar antes de boot().
        $this->app['events']->listen(function (ConnectionEstablished $event): void {
            $role = config('database.connections.pgsql.role');
            if ($event->connectionName === 'pgsql' && filled($role)) {
                $event->connection->getPdo()->exec('SET ROLE '.$event->connection->getQueryGrammar()->wrap((string) $role));
            }
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Contador propio: `throttle:N,1` comparte cubeta con el login y, tras varios intentos
        // fallidos, bloquearia "Olvide mi contrasena" justo cuando mas se necesita (spec 035).
        RateLimiter::for('restablecer', fn (Request $request) => Limit::perMinute(5)->by('restablecer|'.$request->getHost().'|'.$request->ip()));
    }
}
