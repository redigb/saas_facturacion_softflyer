<?php

use App\Core\Iam\Presentation\Middleware\RequirePermission;
use App\Core\Tenancy\Presentation\Middleware\EnsureAccountIsActive;
use App\Core\Tenancy\Presentation\Middleware\EnsureIdempotency;
use App\Core\Tenancy\Presentation\Middleware\ResolveTenantFromSubdomain;
use App\Shared\Presentation\ApiErrorRenderer;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Next.js llama a la API desde su servidor y reenvia el subdominio en X-Forwarded-Host.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);

        $middleware->alias([
            'inquilino' => ResolveTenantFromSubdomain::class,
            'permiso' => RequirePermission::class,
            'cuenta.vigente' => EnsureAccountIsActive::class,
            'idempotente' => EnsureIdempotency::class,
        ]);

        // El inquilino se resuelve siempre antes de autenticar (Doc. 07 §2.2).
        $middleware->prependToPriorityList(AuthenticatesRequests::class, ResolveTenantFromSubdomain::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        ApiErrorRenderer::register($exceptions);
    })->create();
