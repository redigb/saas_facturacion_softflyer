<?php

namespace App\Platform\Application;

use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;

/**
 * Indicadores del negocio para la portada del backoffice.
 */
final class PlatformOverview
{
    private const EXPIRING_SOON_DAYS = 2;

    public function __construct(private readonly ClientDirectory $directory) {}

    public function handle(): array
    {
        $clients = collect($this->directory->all());

        $inTrial = $clients->where('modo', 'PRUEBA');
        $activeTrials = $inTrial->filter(fn (array $c) => ! $c['prueba']['vencida']);
        $fromWeb = $clients->where('origen', 'PRUEBA_WEB');
        $converted = $fromWeb->where('modo', 'PAGO');

        return [
            'clientes' => $clients->count(),
            'en_prueba' => $activeTrials->count(),
            'por_vencer' => $activeTrials->filter(fn (array $c) => $c['prueba']['dias_restantes'] <= self::EXPIRING_SOON_DAYS)->count(),
            'pruebas_vencidas' => $inTrial->count() - $activeTrials->count(),
            'de_pago' => $clients->where('modo', 'PAGO')->where('estado', 'ACTIVO')->count(),
            'suspendidos' => $clients->where('estado', 'SUSPENDIDO')->count(),
            'solicitudes_pendientes' => TrialRegistration::whereNull('verificado_en')->where('token_expira_en', '>', now())->count(),
            'conversion' => $fromWeb->isEmpty() ? null : round($converted->count() / $fromWeb->count() * 100),
            // Lo urgente para ventas: pruebas por vencer o vencidas, de la que vence antes a la que vence despues.
            'seguimiento' => $inTrial
                ->filter(fn (array $c) => $c['prueba']['dias_restantes'] <= self::EXPIRING_SOON_DAYS)
                ->sortBy(fn (array $c) => $c['prueba']['vence_en'])
                ->values()
                ->take(8)
                ->all(),
        ];
    }
}
