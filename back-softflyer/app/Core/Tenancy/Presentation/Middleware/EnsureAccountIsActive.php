<?php

namespace App\Core\Tenancy\Presentation\Middleware;

use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea la operacion si la prueba gratis vencio o la cuenta fue suspendida. El login
 * y /auth/yo siguen disponibles para que el frontend explique como regularizar.
 */
final class EnsureAccountIsActive
{
    public function __construct(private readonly TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->context->tenant();

        if ($tenant->estado === TenantStatus::Suspended) {
            throw new BusinessException('CUENTA_SUSPENDIDA', 'Tu cuenta está suspendida. Comunícate con ventas para reactivarla.', 402);
        }

        if ($tenant->trial()['vencida'] ?? false) {
            throw new BusinessException('PRUEBA_VENCIDA', 'Tu prueba gratis terminó. Comunícate con ventas para activar tu plan.', 402);
        }

        return $next($request);
    }
}
