<?php

namespace Tests\Feature\Platform;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Tests\DatabaseTestCase;

class PlatformTest extends DatabaseTestCase
{
    private const API = 'http://admin.localhost/api/v1/plataforma/';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);
        PlatformAdmin::create(['nombre' => 'Dueño', 'correo' => 'admin@softflyer.pe', 'contrasena' => 'admin-softflyer-2026']);
    }

    public function test_admin_logs_in_and_sees_clients_of_every_tenant(): void
    {
        $this->provision('lacasona', TenantStatus::Trial);
        $this->provision('donjose', TenantStatus::Active);

        $this->withToken($this->adminToken())->getJson(self::API.'clientes')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'donjose')
            ->assertJsonPath('data.0.modo', 'PAGO')
            ->assertJsonPath('data.1.slug', 'lacasona')
            ->assertJsonPath('data.1.modo', 'PRUEBA')
            ->assertJsonPath('data.1.usuarios', 1);
    }

    public function test_trial_becomes_paid_client_and_keeps_history(): void
    {
        $tenant = $this->provision('lacasona', TenantStatus::Trial);
        $token = $this->adminToken();

        $this->withToken($token)->postJson(self::API.'clientes/lacasona/activar-plan', ['plan' => 'RESTAURANTE', 'meses' => 3])
            ->assertOk();

        $this->assertSame(TenantStatus::Active, $tenant->refresh()->estado);
        $this->withToken($token)->getJson(self::API.'clientes/lacasona')
            ->assertJsonPath('data.modo', 'PAGO')
            ->assertJsonPath('data.suscripciones.0.estado', 'ACTIVA')
            ->assertJsonPath('data.suscripciones.0.fecha_vencimiento', today()->addMonths(3)->toDateString())
            ->assertJsonPath('data.suscripciones.1.estado', 'PRUEBA')
            ->assertJsonPath('data.bitacora.0.accion', 'PLAN_ACTIVADO');
    }

    public function test_expired_trial_is_extended_from_today(): void
    {
        $tenant = $this->provision('lacasona', TenantStatus::Trial);
        $this->insideTenant($tenant, fn () => Subscription::query()->update([
            'fecha_inicio' => today()->subDays(10),
            'fecha_vencimiento' => today()->subDays(3),
        ]));

        $this->withToken($this->adminToken())->postJson(self::API.'clientes/lacasona/extender-prueba', ['dias' => 5])->assertOk();

        $this->insideTenant($tenant, fn () => $this->assertSame(
            today()->addDays(5)->toDateString(),
            Subscription::firstOrFail()->fecha_vencimiento->toDateString(),
        ));
    }

    public function test_suspended_client_cannot_use_the_panel_until_reactivated(): void
    {
        $tenant = $this->provision('donjose', TenantStatus::Active);
        $adminToken = $this->adminToken();
        $userToken = $this->userToken($tenant);

        $this->withToken($adminToken)->postJson(self::API.'clientes/donjose/suspender', ['motivo' => 'Pago pendiente'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($userToken)->getJson($this->tenantUrl('donjose', 'panel/resumen'))
            ->assertStatus(402)
            ->assertJsonPath('error.codigo', 'CUENTA_SUSPENDIDA');

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->postJson(self::API.'clientes/donjose/reactivar')->assertOk();
        $this->assertSame(TenantStatus::Active, $tenant->refresh()->estado);
    }

    public function test_admin_creates_a_paid_client_with_a_temporary_password(): void
    {
        $response = $this->withToken($this->adminToken())->postJson(self::API.'clientes', [
            'ruc' => '20601234565',
            'razon_social' => 'EL HUARIQUE S.A.C.',
            'nombre_comercial' => 'El Huarique',
            'slug' => 'elhuarique',
            'nombre_contacto' => 'Luis Paz',
            'correo' => 'luis@elhuarique.pe',
            'plan' => 'RESTAURANTE',
            'meses' => 12,
        ])->assertCreated();

        $this->postJson($this->tenantUrl('elhuarique', 'auth/login'), [
            'correo' => 'luis@elhuarique.pe',
            'contrasena' => $response->json('data.contrasena_temporal'),
        ])
            ->assertOk()
            ->assertJsonPath('data.inquilino.modo', 'PAGO');
    }

    public function test_client_detail_shows_fiscal_status_without_secrets_and_admin_sets_homologation(): void
    {
        $this->provision('donjose', TenantStatus::Active);
        $token = $this->adminToken();

        $this->withToken($token)->getJson(self::API.'clientes/donjose')->assertOk()
            ->assertJsonPath('data.fiscal.certificado', null)
            ->assertJsonPath('data.fiscal.homologado', false)
            ->assertJsonPath('data.fiscal.entorno', 'BETA')
            ->assertJsonMissingPath('data.fiscal.clave_sol');

        $this->withToken($token)->postJson(self::API.'clientes/donjose/homologacion', ['homologado' => true])->assertOk();
        $this->withToken($token)->getJson(self::API.'clientes/donjose')
            ->assertJsonPath('data.fiscal.homologado', true)
            ->assertJsonPath('data.bitacora.0.accion', 'HOMOLOGACION_ACTUALIZADA');
        $this->withToken($token)->postJson(self::API.'clientes/donjose/homologacion', [])->assertStatus(422);
    }

    public function test_the_admin_loads_the_client_fiscal_data_and_the_igv_per_branch(): void
    {
        $this->provision('donjose', TenantStatus::Active);
        $token = $this->adminToken();

        // La facturación del cliente es del backoffice, y la clave nunca vuelve en la respuesta.
        $this->withToken($token)->putJson(self::API.'clientes/donjose/fiscal/credenciales-sol', ['usuario_sol' => 'MODDATOS', 'clave_sol' => 'secreta1234'])
            ->assertOk()->assertJsonMissingPath('data.clave_sol');
        $detail = $this->withToken($token)->getJson(self::API.'clientes/donjose')
            ->assertJsonPath('data.fiscal.usuario_sol', 'MODDATOS')
            ->assertJsonPath('data.fiscal.tiene_clave_sol', true)
            ->assertJsonPath('data.bitacora.0.accion', 'CREDENCIALES_SOL_ACTUALIZADAS');
        $this->assertStringNotContainsString('secreta1234', $detail->getContent());

        $branch = $detail->json('data.sucursales_detalle.0.id');
        $rates = $detail->json('data.tasas_igv');
        $this->assertNotEmpty($rates);
        $this->assertNull($detail->json('data.sucursales_detalle.0.tasa_igv_id'));
        $this->assertFalse($detail->json('data.sucursales_detalle.0.exonerado_amazonia'));

        // Sucursal en la Amazonía de servicios con una tasa propia; cada cambio queda en la bitácora.
        $this->withToken($token)->patchJson(self::API."clientes/donjose/fiscal/sucursales/{$branch}", ['exonerado_amazonia' => true, 'leyenda_amazonia' => '2002'])->assertOk();
        $this->withToken($token)->patchJson(self::API."clientes/donjose/fiscal/sucursales/{$branch}", ['tasa_igv_id' => $rates[0]['id']])->assertOk();
        $this->withToken($token)->getJson(self::API.'clientes/donjose')
            ->assertJsonPath('data.sucursales_detalle.0.exonerado_amazonia', true)
            ->assertJsonPath('data.sucursales_detalle.0.leyenda_amazonia', '2002')
            ->assertJsonPath('data.sucursales_detalle.0.tasa_igv_id', $rates[0]['id'])
            ->assertJsonPath('data.bitacora.0.accion', 'TASA_IGV_ACTUALIZADA')
            ->assertJsonPath('data.bitacora.1.accion', 'AMAZONIA_LOCAL_ACTUALIZADA');

        // Volver a heredar la tasa de la empresa, y la de la empresa misma.
        $this->withToken($token)->patchJson(self::API."clientes/donjose/fiscal/sucursales/{$branch}", ['tasa_igv_id' => null])->assertOk();
        $this->withToken($token)->getJson(self::API.'clientes/donjose')->assertJsonPath('data.sucursales_detalle.0.tasa_igv_id', null);
        $this->withToken($token)->putJson(self::API.'clientes/donjose/fiscal/tasa-igv', ['tasa_igv_id' => $rates[0]['id']])->assertOk();
        $this->withToken($token)->putJson(self::API.'clientes/donjose/fiscal/tasa-igv', ['tasa_igv_id' => 99999])->assertStatus(422);
        $this->withToken($token)->patchJson(self::API."clientes/donjose/fiscal/sucursales/{$branch}", ['leyenda_amazonia' => '2009'])->assertStatus(422);

        $this->withToken($token)->postJson(self::API.'clientes/donjose/fiscal/certificado', [])->assertStatus(422);
    }

    public function test_credentials_can_be_tested_only_when_the_client_is_configured_and_alerts_are_listed(): void
    {
        $this->provision('donjose', TenantStatus::Active);
        $token = $this->adminToken();

        $this->withToken($token)->postJson(self::API.'clientes/donjose/fiscal/probar-credenciales')
            ->assertStatus(422)->assertJsonPath('error.codigo', 'FALTA_CONFIGURAR');
        $this->withToken($token)->getJson(self::API.'alertas')->assertOk()->assertJsonPath('data', []);
    }

    public function test_tokens_do_not_cross_between_platform_and_tenants(): void
    {
        $tenant = $this->provision('donjose', TenantStatus::Active);
        $adminToken = $this->adminToken();
        $userToken = $this->userToken($tenant);

        // Un usuario de restaurante no entra al backoffice...
        $this->withToken($userToken)->getJson(self::API.'clientes')->assertUnauthorized();
        $this->app['auth']->forgetGuards();

        // ...un administrador de plataforma no opera como usuario de un restaurante...
        $this->withToken($adminToken)->getJson($this->tenantUrl('donjose', 'auth/yo'))->assertUnauthorized();
        $this->app['auth']->forgetGuards();

        // ...y el backoffice no existe fuera de admin.{dominio}.
        $this->withToken($adminToken)->getJson($this->tenantUrl('donjose', 'plataforma/clientes'))->assertNotFound();
    }

    private function provision(string $slug, TenantStatus $status): Tenant
    {
        $tenant = $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => $status === TenantStatus::Trial ? 'PRUEBA' : 'RESTAURANTE', 'estado' => $status],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
        $this->app->make(TenantContext::class)->clear();

        return $tenant;
    }

    private function adminToken(): string
    {
        return $this->postJson(self::API.'auth/login', ['correo' => 'admin@softflyer.pe', 'contrasena' => 'admin-softflyer-2026'])
            ->assertOk()
            ->json('data.token');
    }

    private function userToken(Tenant $tenant): string
    {
        return $this->insideTenant($tenant, fn () => User::firstOrFail()->createToken('web')->plainTextToken);
    }

    private function insideTenant(Tenant $tenant, callable $callback): mixed
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);

        try {
            return $callback();
        } finally {
            $context->clear();
        }
    }
}
