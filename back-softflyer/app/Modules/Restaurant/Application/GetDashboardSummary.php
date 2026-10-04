<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Resumen del panel de control del administrador: estado de la cuenta, que tiene
 * cargado el restaurante y que le falta para empezar a vender y facturar.
 *
 * Todas las consultas corren bajo RLS: solo ven filas del inquilino actual.
 */
final class GetDashboardSummary
{
    public function __construct(private readonly TenantContext $context) {}

    public function handle(): array
    {
        $company = Company::query()->orderBy('id')->first();
        $counts = $this->counts();

        return [
            'empresa' => $company === null ? null : [
                'nombre_comercial' => $company->nombre_comercial,
                'razon_social' => $company->razon_social,
                'ruc' => $company->ruc,
                'homologado' => $company->homologado,
            ],
            'suscripcion' => $this->subscription(),
            'conteos' => $counts,
            'configuracion' => $this->setupChecklist($company, $counts),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function counts(): array
    {
        $row = DB::selectOne(<<<'SQL'
            SELECT
                (SELECT count(*) FROM sucursales WHERE eliminado_en IS NULL) AS sucursales,
                (SELECT count(*) FROM salones WHERE eliminado_en IS NULL AND es_activo) AS salones,
                (SELECT count(*) FROM mesas WHERE es_activa) AS mesas,
                (SELECT coalesce(sum(capacidad), 0) FROM mesas WHERE es_activa) AS asientos,
                (SELECT count(*) FROM categorias WHERE eliminado_en IS NULL AND es_activa) AS categorias,
                (SELECT count(*) FROM productos WHERE eliminado_en IS NULL AND es_activo AND es_vendible) AS productos,
                (SELECT count(*) FROM estaciones_preparacion WHERE es_activa) AS estaciones,
                (SELECT count(*) FROM usuarios WHERE eliminado_en IS NULL AND es_activo) AS usuarios,
                (SELECT count(*) FROM series_comprobante WHERE es_activa) AS series,
                (SELECT count(*) FROM certificados_digitales WHERE es_activo) AS certificados
        SQL);

        return array_map('intval', (array) $row);
    }

    private function subscription(): ?array
    {
        $subscription = Subscription::with('plan')->latest('id')->first();

        if ($subscription === null) {
            return null;
        }

        return [
            'plan' => $subscription->plan->nombre,
            'estado' => $subscription->estado,
            'fecha_vencimiento' => $subscription->fecha_vencimiento->toDateString(),
            'dias_restantes' => max(0, (int) today()->diffInDays($subscription->fecha_vencimiento, false)),
        ];
    }

    /**
     * Pasos para dejar el restaurante listo, en el orden en que conviene hacerlos.
     */
    private function setupChecklist(?Company $company, array $counts): array
    {
        $steps = [
            ['datos_fiscales', 'Datos fiscales', 'RUC, razón social y dirección de tu empresa.',
                $company?->ruc !== null && $company->razon_social !== null && $company->direccion_fiscal !== null],
            ['plano', 'Plano del salón', 'Dibuja tus salones y ubica tus mesas.', $counts['mesas'] > 0],
            ['carta', 'Carta', 'Carga tus platos y bebidas con sus precios.', $counts['productos'] > 0],
            ['series', 'Series de comprobantes', 'Define tus series de boletas y facturas (B001, F001).', $counts['series'] > 0],
            ['certificado', 'Certificado digital', 'Sube el certificado con el que se firman tus comprobantes.', $counts['certificados'] > 0],
            ['equipo', 'Tu equipo', 'Crea los usuarios de tus mozos, cajeros y cocineros.', $counts['usuarios'] > 1],
            ['sunat', 'Emisión en producción', 'Completa la homologación ante SUNAT para emitir comprobantes reales.', (bool) $company?->homologado],
        ];

        return array_map(fn (array $step) => array_combine(['clave', 'titulo', 'descripcion', 'completo'], $step), $steps);
    }
}
