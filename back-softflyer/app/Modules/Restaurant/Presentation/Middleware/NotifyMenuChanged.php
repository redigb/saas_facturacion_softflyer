<?php

namespace App\Modules\Restaurant\Presentation\Middleware;

use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Modules\Restaurant\Infrastructure\Realtime\MenuUpdated;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tras cualquier escritura exitosa de la carta, avisa a las pantallas abiertas (spec 005).
 * Va en las rutas de escritura de categorías, productos, estaciones y modificadores.
 */
final class NotifyMenuChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response->isSuccessful() && ! $request->isMethodSafe()) {
            $branches = Branch::where('es_activa', true)->pluck('id')->all();

            if ($branches !== []) {
                event(new MenuUpdated($branches, $request->user()->getKey()));
            }
        }

        return $response;
    }
}
