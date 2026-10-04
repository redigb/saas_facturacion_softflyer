<?php

namespace App\Core\Tenancy\Application;

use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Shared\Exceptions\BusinessException;

/**
 * Un subdominio esta libre si no es reservado, no lo usa un restaurante y no lo
 * aparto otra solicitud de prueba vigente.
 */
final class SubdomainAvailability
{
    public function ensureAvailable(string $slug, ?string $exceptRuc = null): void
    {
        $reservedForPendingTrial = TrialRegistration::where('slug', $slug)
            ->when($exceptRuc, fn ($query) => $query->where('ruc', '!=', $exceptRuc))
            ->whereNull('verificado_en')
            ->where('token_expira_en', '>', now())
            ->exists();

        if (in_array($slug, config('softflyer.subdominios_reservados'), true)
            || Tenant::where('slug', $slug)->exists()
            || $reservedForPendingTrial) {
            throw new BusinessException('SUBDOMINIO_NO_DISPONIBLE', 'Esa dirección ya está en uso. Prueba con otra.', 409, [
                'slug' => ['Esa dirección ya está en uso.'],
            ]);
        }
    }
}
