<?php

namespace App\Core\Tenancy\Application;

use App\Core\Iam\Infrastructure\Persistence\Role;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Plan;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Alta de un restaurante en una sola transaccion (Doc. 03 §4): si un paso falla,
 * no queda un inquilino a medias.
 */
final class ProvisionTenant
{
    public function __construct(private readonly TenantContext $context) {}

    /**
     * @param  array{slug: string, nombre: string, plan: string, es_demo?: bool, estado?: TenantStatus, meses?: int}  $tenant
     * @param  array{nombre: string, correo: string, contrasena: string}  $admin  contrasena en claro o ya hasheada
     * @param  array{ruc?: string, razon_social?: string}  $company
     */
    public function handle(array $tenant, array $admin, array $company = []): Tenant
    {
        return DB::transaction(function () use ($tenant, $admin, $company) {
            $status = $tenant['estado'] ?? TenantStatus::Trial;

            $model = Tenant::create([
                'slug' => $tenant['slug'],
                'nombre' => $tenant['nombre'],
                'estado' => $status,
                'es_demo' => $tenant['es_demo'] ?? false,
            ]);

            $this->context->set($model);

            $plan = Plan::where('codigo', $tenant['plan'])->firstOrFail();
            Subscription::create([
                'plan_id' => $plan->id,
                'estado' => $status === TenantStatus::Trial ? 'PRUEBA' : 'ACTIVA',
                'fecha_inicio' => today(),
                'fecha_vencimiento' => $status === TenantStatus::Trial
                    ? today()->addDays(config('softflyer.prueba.dias'))
                    : today()->addMonths($tenant['meses'] ?? 1),
            ]);

            $companyModel = Company::create($company + ['nombre_comercial' => $tenant['nombre']]);
            Branch::create([
                'empresa_id' => $companyModel->id,
                'nombre' => 'Local principal',
                'es_principal' => true,
            ]);

            $roles = $this->createTemplateRoles($model);

            $user = User::create($admin + ['es_activo' => true]);
            DB::table('rol_usuario')->insert([
                'inquilino_id' => $model->id,
                'usuario_id' => $user->id,
                'rol_id' => $roles['Administrador'],
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]);

            DB::table('uso_inquilino')->insert([
                'inquilino_id' => $model->id,
                'periodo' => today()->format('Y-m'),
                'usuarios_activos' => 1,
                'sucursales_activas' => 1,
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]);

            return $model;
        });
    }

    /**
     * @return array<string, int> nombre del rol => id
     */
    private function createTemplateRoles(Tenant $tenant): array
    {
        $permissionIds = DB::table('permisos')->pluck('id', 'codigo');
        $roles = [];

        foreach (config('softflyer.roles_plantilla') as $name => $template) {
            $role = Role::create([
                'nombre' => $name,
                'descripcion' => $template['descripcion'],
                'es_sistema' => true,
            ]);

            $codes = $template['permisos'] === '*' ? $permissionIds->keys() : collect($template['permisos']);

            DB::table('permiso_rol')->insert($codes->map(fn (string $code) => [
                'inquilino_id' => $tenant->id,
                'rol_id' => $role->id,
                'permiso_id' => $permissionIds[$code],
            ])->all());

            $roles[$name] = $role->id;
        }

        return $roles;
    }
}
