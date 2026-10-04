<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\DemoRestauranteSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;

class DashboardTest extends DatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);
    }

    public function test_admin_of_a_new_paid_account_sees_an_empty_setup_checklist(): void
    {
        $tenant = $this->provision('donjose');

        $this->withToken($this->adminToken($tenant))
            ->getJson($this->tenantUrl('donjose', 'panel/resumen'))
            ->assertOk()
            ->assertJsonPath('data.empresa.nombre_comercial', 'Donjose')
            ->assertJsonPath('data.suscripcion.estado', 'ACTIVA')
            ->assertJsonPath('data.conteos.mesas', 0)
            ->assertJsonPath('data.configuracion.0.clave', 'datos_fiscales')
            ->assertJsonPath('data.configuracion.0.completo', false);
    }

    public function test_demo_counts_only_its_own_restaurant(): void
    {
        $demo = $this->provision('demo', isDemo: true);
        $this->seed(DemoRestauranteSeeder::class);
        $other = $this->provision('donjose');

        $this->withToken($this->adminToken($other))
            ->getJson($this->tenantUrl('donjose', 'panel/resumen'))
            ->assertJsonPath('data.conteos.mesas', 0)
            ->assertJsonPath('data.conteos.productos', 0);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->adminToken($demo))
            ->getJson($this->tenantUrl('demo', 'panel/resumen'))
            ->assertOk()
            ->assertJsonPath('data.conteos.mesas', 13)
            ->assertJsonPath('data.conteos.productos', 13)
            ->assertJsonPath('data.configuracion.1.clave', 'plano')
            ->assertJsonPath('data.configuracion.1.completo', true);
    }

    public function test_user_without_panel_permission_is_forbidden(): void
    {
        $tenant = $this->provision('donjose');
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);

        $waiter = User::create(['nombre' => 'Mozo', 'correo' => 'mozo@donjose.pe', 'contrasena' => 'contrasena-segura']);
        DB::table('rol_usuario')->insert([
            'inquilino_id' => $tenant->id,
            'usuario_id' => $waiter->id,
            'rol_id' => DB::table('roles')->where('nombre', 'Mozo')->value('id'),
        ]);
        $context->clear();

        $this->withToken($waiter->createToken('web')->plainTextToken)
            ->getJson($this->tenantUrl('donjose', 'panel/resumen'))
            ->assertForbidden()
            ->assertJsonPath('error.codigo', 'NO_AUTORIZADO');
    }

    public function test_profile_includes_roles_and_permissions(): void
    {
        $tenant = $this->provision('donjose');

        $this->withToken($this->adminToken($tenant))
            ->getJson($this->tenantUrl('donjose', 'auth/yo'))
            ->assertOk()
            ->assertJsonPath('data.roles', ['Administrador'])
            ->assertJsonFragment(['panel.ver']);
    }

    private function provision(string $slug, bool $isDemo = false): Tenant
    {
        $tenant = $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => 'RESTAURANTE', 'es_demo' => $isDemo, 'estado' => TenantStatus::Active],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
        $this->app->make(TenantContext::class)->clear();

        return $tenant;
    }

    private function adminToken(Tenant $tenant): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        $token = User::where('correo', "admin@{$tenant->slug}.pe")->firstOrFail()->createToken('web')->plainTextToken;
        $context->clear();

        return $token;
    }
}
