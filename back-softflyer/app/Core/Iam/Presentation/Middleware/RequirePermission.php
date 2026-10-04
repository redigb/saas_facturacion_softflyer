<?php

namespace App\Core\Iam\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Uso: ->middleware('permiso:panel.ver'). Corre despues de auth:sanctum.
 */
final class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (! $request->user()?->hasPermission($permission)) {
            throw new AccessDeniedHttpException;
        }

        return $next($request);
    }
}
