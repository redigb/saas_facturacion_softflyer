<?php

namespace Tests\Feature\Tenancy;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;

class ProvisionTenantTest extends DatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);
    }

    public function test_new_restaurant_gets_company_branch_roles_and_an_admin(): void
    {
        $tenant = $this->provision('lacasona');
        $this->app->make(TenantContext::class)->set($tenant);

        $this->assertSame(1, DB::table('empresas')->count());
        $this->assertSame(1, DB::table('sucursales')->where('es_principal', true)->count());
        $this->assertSame(1, DB::table('suscripciones')->where('estado', 'PRUEBA')->count());
        $this->assertSame(
            array_keys(config('softflyer.roles_plantilla')),
            DB::table('roles')->orderBy('id')->pluck('nombre')->all(),
        );

        $admin = User::where('correo', 'admin@lacasona.pe')->firstOrFail();
        $this->assertSame(['Administrador'], $admin->roles->pluck('nombre')->all());
        $this->assertCount(count(config('softflyer.permisos')), $admin->permissionCodes());
    }

    public function test_failed_provisioning_leaves_nothing_behind(): void
    {
        try {
            $this->provision('fallido', plan: 'NO_EXISTE');
            $this->fail('Se esperaba que el alta fallara.');
        } catch (ModelNotFoundException) {
            // El plan no existe: la transaccion debe revertir todo.
        }

        $this->assertFalse(Tenant::where('slug', 'fallido')->exists());
    }

    private function provision(string $slug, string $plan = 'PRUEBA'): Tenant
    {
        return $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => $plan],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
    }
}
