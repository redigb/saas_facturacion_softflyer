<?php

namespace App\Platform\Application;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Vista de todos los clientes para el backoffice.
 *
 * No usa ningun rol con BYPASSRLS: entra al contexto RLS de cada restaurante, uno por
 * uno, con el mismo rol que usa la API. Es O(clientes) consultas; suficiente para
 * cientos de clientes. Con miles conviene un rol de solo lectura (Doc. 06 §1.2).
 */
final class ClientDirectory
{
    public function __construct(private readonly TenantContext $context) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function all(): array
    {
        $tenants = Tenant::where('es_demo', false)->orderByDesc('id')->get();
        $leads = TrialRegistration::whereNotNull('inquilino_id')->get()->keyBy('inquilino_id');

        return $this->insideEach($tenants, fn (Tenant $tenant) => $this->summarize($tenant, $leads[$tenant->id] ?? null));
    }

    /**
     * @return array<string, mixed>
     */
    public function find(Tenant $tenant): array
    {
        $lead = TrialRegistration::where('inquilino_id', $tenant->id)->first();

        [$detail] = $this->insideEach(collect([$tenant]), fn (Tenant $tenant) => $this->summarize($tenant, $lead) + [
            'suscripciones' => Subscription::with('plan')->orderByDesc('id')->get()->map(fn (Subscription $s) => [
                'plan' => $s->plan->nombre,
                'estado' => $s->estado,
                'fecha_inicio' => $s->fecha_inicio->toDateString(),
                'fecha_vencimiento' => $s->fecha_vencimiento->toDateString(),
            ])->all(),
            'fiscal' => app(ManageFiscalConfiguration::class)->status(),
            'tasas_igv' => app(ManageFiscalConfiguration::class)->rates(),
            'sucursales_detalle' => DB::table('sucursales')->whereNull('eliminado_en')->orderBy('id')->get(['id', 'nombre', 'tasa_igv_id', 'exonerado_amazonia', 'leyenda_amazonia'])->map(fn ($row) => [
                'id' => (int) $row->id,
                'nombre' => $row->nombre,
                'tasa_igv_id' => $row->tasa_igv_id === null ? null : (int) $row->tasa_igv_id,
                'exonerado_amazonia' => (bool) $row->exonerado_amazonia,
                'leyenda_amazonia' => $row->leyenda_amazonia,
            ])->all(),
            'usuarios_detalle' => User::orderBy('id')->get(['id', 'nombre', 'correo', 'es_activo'])->toArray(),
            'conteos' => (array) DB::selectOne(<<<'SQL'
                SELECT (SELECT count(*) FROM mesas) AS mesas,
                       (SELECT count(*) FROM productos WHERE eliminado_en IS NULL) AS productos,
                       (SELECT count(*) FROM sucursales WHERE eliminado_en IS NULL) AS sucursales
            SQL),
        ]);

        $detail['bitacora'] = PlatformLog::with('admin:id,nombre')
            ->where('inquilino_id', $tenant->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (PlatformLog $log) => [
                'accion' => $log->accion,
                'detalle' => $log->detalle,
                'administrador' => $log->admin->nombre,
                'creado_en' => $log->creado_en->toIso8601ZuluString(),
            ])
            ->all();

        return $detail;
    }

    /** Tiempo (horas) que un comprobante real puede seguir pendiente antes de avisar. */
    private const STALE_PENDING_HOURS = 1;

    /** Comprobantes que se listan dentro de cada alerta. */
    private const RECEIPTS_PER_ALERT = 10;

    /** Días de margen para avisar que un certificado está por vencer. */
    private const CERTIFICATE_WARNING_DAYS = 30;

    /**
     * Lo que pide atención en la facturación de cada cliente, lo más grave primero. Solo mira comprobantes
     * reales: los simulados nunca salen a SUNAT y no son un problema.
     *
     * @return list<array{slug: string, cliente: string, tipo: string, severidad: string, cantidad: int, detalle: string, comprobantes: list<array<string, mixed>>}>
     */
    public function alerts(): array
    {
        $tenants = Tenant::where('es_demo', false)->orderBy('id')->get();
        $found = array_merge(...$this->insideEach($tenants, fn (Tenant $tenant) => $this->alertsOf($tenant)));
        usort($found, fn (array $a, array $b) => [$a['severidad'] === 'alta' ? 0 : 1, $a['cliente']] <=> [$b['severidad'] === 'alta' ? 0 : 1, $b['cliente']]);

        return $found;
    }

    /** @return list<array<string, mixed>> */
    private function alertsOf(Tenant $tenant): array
    {
        $alerts = [];
        $add = function (string $type, string $severity, int $count, string $detail, array $receipts = []) use (&$alerts, $tenant) {
            if ($count > 0) {
                $alerts[] = ['slug' => $tenant->slug, 'cliente' => $tenant->nombre, 'tipo' => $type, 'severidad' => $severity, 'cantidad' => $count, 'detalle' => $detail, 'comprobantes' => $receipts];
            }
        };
        // Cuántos hay y los más antiguos, para saber por dónde empezar.
        $scan = fn ($query) => [$query->count(), $this->sampleReceipts($query)];

        $real = fn () => DB::table('comprobantes')->where('es_simulado', false);
        $credentials = $real()->where('estado', 'PENDIENTE_ENVIO')->where('motivo_espera', 'CREDENCIALES');
        $noCdr = $real()->where('estado', 'SIN_CDR');
        $expired = $real()->where('estado', 'VENCIDO');
        $stale = $real()->where('estado', 'PENDIENTE_ENVIO')
            ->where(fn ($q) => $q->whereNull('motivo_espera')->orWhere('motivo_espera', '!=', 'CREDENCIALES'))
            ->where('emitido_en', '<', now()->subHours(self::STALE_PENDING_HOURS));

        [$count, $rows] = $scan($credentials);
        $add('CREDENCIALES', 'alta', $count, 'Comprobantes detenidos: SUNAT rechazó el usuario o la clave SOL. Corrígelos y se envían solos.', $rows);
        [$count, $rows] = $scan($noCdr);
        $add('SIN_CDR', 'alta', $count, 'SUNAT los registró pero no entregó el CDR en 48 h.', $rows);
        [$count, $rows] = $scan($expired);
        $add('VENCIDO', 'alta', $count, 'No se pudieron informar a SUNAT dentro del plazo de 48 h.', $rows);
        [$count, $rows] = $scan($stale);
        $add('PENDIENTES', 'media', $count, 'Siguen sin enviarse después de '.self::STALE_PENDING_HOURS.' h (se reintentan solos).', $rows);

        $certificate = DB::table('certificados_digitales')->where('es_activo', true)->first(['vence_en']);
        if ($certificate !== null) {
            $days = (int) today()->diffInDays(Carbon::parse($certificate->vence_en), false);
            $add('CERTIFICADO', $days < 0 ? 'alta' : 'media', $days <= self::CERTIFICATE_WARNING_DAYS ? 1 : 0, $days < 0 ? 'El certificado digital ya venció: no se puede emitir.' : "El certificado digital vence en {$days} días.");
        }

        return $alerts;
    }

    /** @return list<array<string, mixed>> */
    private function sampleReceipts($query): array
    {
        return (clone $query)
            ->join('tipos_comprobante', 'tipos_comprobante.id', '=', 'comprobantes.tipo_comprobante_id')
            ->orderBy('comprobantes.emitido_en')
            ->limit(self::RECEIPTS_PER_ALERT)
            ->get(['comprobantes.serie', 'comprobantes.correlativo', 'tipos_comprobante.nombre as tipo', 'comprobantes.total', 'comprobantes.emitido_en', 'comprobantes.intentos_envio', 'comprobantes.ultimo_error_tecnico', 'comprobantes.mensaje_respuesta_sunat'])
            ->map(fn ($row) => [
                'numero' => sprintf('%s-%d', $row->serie, $row->correlativo),
                'tipo' => $row->tipo,
                'total' => $row->total,
                'emitido_en' => Carbon::parse($row->emitido_en)->toIso8601ZuluString(),
                'intentos' => (int) $row->intentos_envio,
                'error' => $row->ultimo_error_tecnico ?? $row->mensaje_respuesta_sunat,
            ])
            ->all();
    }

    /**
     * Ejecuta $callback dentro del contexto RLS de cada inquilino y siempre lo limpia al final.
     */
    private function insideEach(iterable $tenants, callable $callback): array
    {
        $rows = [];

        try {
            foreach ($tenants as $tenant) {
                $this->context->set($tenant);
                $rows[] = $callback($tenant);
            }
        } finally {
            $this->context->clear();
        }

        return $rows;
    }

    private function summarize(Tenant $tenant, ?TrialRegistration $lead): array
    {
        $company = Company::orderBy('id')->first();
        $subscription = Subscription::with('plan')->orderByDesc('id')->first();
        $admin = User::orderBy('id')->first(['nombre', 'correo']);

        return [
            'id' => $tenant->id,
            'slug' => $tenant->slug,
            'nombre' => $tenant->nombre,
            'estado' => $tenant->estado->value,
            'modo' => $tenant->mode()->value,
            'ruc' => $company?->ruc,
            'razon_social' => $company?->razon_social,
            'plan' => $subscription?->plan->nombre,
            'suscripcion' => $subscription === null ? null : [
                'estado' => $subscription->estado,
                'fecha_vencimiento' => $subscription->fecha_vencimiento->toDateString(),
                'dias_restantes' => (int) today()->diffInDays($subscription->fecha_vencimiento, false),
            ],
            'prueba' => $tenant->trial(),
            'usuarios' => User::count(),
            'origen' => $lead === null ? 'MANUAL' : 'PRUEBA_WEB',
            'contacto' => [
                'nombre' => $lead?->nombre_contacto ?? $admin?->nombre,
                'correo' => $lead?->correo ?? $admin?->correo,
                'telefono' => $lead?->telefono,
            ],
            'creado_en' => $tenant->creado_en->toIso8601ZuluString(),
        ];
    }
}
