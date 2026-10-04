<?php

namespace App\Platform\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * El backoffice solo responde en admin.{dominio_central}. Desde el subdominio de un
 * restaurante, sus rutas simplemente no existen.
 */
final class EnsurePlatformHost
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->getHost() !== 'admin.'.config('softflyer.dominio_central')) {
            throw new NotFoundHttpException;
        }

        return $next($request);
    }
}
