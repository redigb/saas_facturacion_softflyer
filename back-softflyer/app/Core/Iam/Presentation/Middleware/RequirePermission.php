<?php

namespace App\Core\Iam\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Uso: ->middleware('permiso:panel.ver'), o 'permiso:a|b' para exigir cualquiera de ellos.
 * Corre despues de auth:sanctum.
 */
final class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        $allowed = $user !== null && collect(explode('|', $permission))->contains(fn (string $code) => $user->hasPermission($code));

        if (! $allowed) {
            throw new AccessDeniedHttpException;
        }

        return $next($request);
    }
}
