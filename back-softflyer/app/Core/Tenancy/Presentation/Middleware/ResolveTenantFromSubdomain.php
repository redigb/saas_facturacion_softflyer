<?php

namespace App\Core\Tenancy\Presentation\Middleware;

use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * {slug}.{dominio_central} decide el inquilino, nunca la URL ni el body (Doc. 06 §1.1, Doc. 07 §2.2).
 * Corre antes que Sanctum para que hasta el login opere dentro de RLS.
 */
final class ResolveTenantFromSubdomain
{
    public function __construct(private readonly TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::query()->where('slug', $this->slugFrom($request->getHost()))->first();

        if ($tenant === null) {
            throw new BusinessException('INQUILINO_NO_ENCONTRADO', 'No existe una empresa registrada en esta dirección.', 404);
        }

        $this->context->set($tenant);

        return $next($request);
    }

    private function slugFrom(string $host): ?string
    {
        $suffix = '.'.config('softflyer.dominio_central');

        if (! str_ends_with($host, $suffix)) {
            return null;
        }

        $slug = substr($host, 0, -strlen($suffix));

        return str_contains($slug, '.') ? null : $slug;
    }
}
