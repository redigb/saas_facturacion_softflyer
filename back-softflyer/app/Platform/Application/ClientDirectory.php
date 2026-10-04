<?php

namespace App\Platform\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformLog;
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
