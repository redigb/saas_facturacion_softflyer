<?php

namespace Tests\Feature\Iam;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;

/**
 * Spec 004: equipo, roles y cambio de usuario con PIN (specs/004-equipo/backend.md).
 */
class TeamTest extends DatabaseTestCase
{
    private Tenant $tenant;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);

        $this->tenant = $this->provision('donjose');
        $this->admin = $this->tokenFor($this->tenant, 'admin@donjose.pe');
    }

    public function test_owner_adds_a_waiter_who_can_then_log_in(): void
    {
        $this->api('POST', 'usuarios', $this->waiter(['pin' => '4821']))
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Rosa Quispe')
            ->assertJsonPath('data.correo', 'rosa@donjose.pe')
            ->assertJsonPath('data.tiene_pin', true)
            ->assertJsonPath('data.roles.0.nombre', 'Mozo')
            ->assertJsonPath('data.es_yo', false)
            ->assertJsonMissingPath('data.pin_hash');

        $this->forget();
        $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'ROSA@donjose.pe', 'contrasena' => 'contrasena-rosa'])
            ->assertOk();

        $this->forget();
        $team = $this->api('GET', 'usuarios')->assertOk()->json('data');
        $this->assertSame(['Admin', 'Rosa Quispe'], array_column($team, 'nombre'));
        $this->assertNotNull($team[1]['ultimo_acceso']);
        $this->assertTrue($team[0]['es_yo']);

        $this->assertSame(2, $this->asTenant(fn () => DB::table('uso_inquilino')->where('periodo', today()->format('Y-m'))->value('usuarios_activos')));
    }

    public function test_validation_rejects_repeated_email_short_password_and_bad_pin(): void
    {
        $this->api('POST', 'usuarios', $this->waiter())->assertCreated();

        $details = $this->api('POST', 'usuarios', $this->waiter(['correo' => 'Rosa@DonJose.pe', 'contrasena' => 'corta', 'pin' => '12']))
            ->assertStatus(422)
            ->json('error.detalles');

        $this->assertSame(['Ya hay alguien del equipo con ese correo.'], $details['correo']);
        $this->assertArrayHasKey('contrasena', $details);
        $this->assertSame(['El PIN tiene de 4 a 6 dígitos.'], $details['pin']);
    }

    public function test_deactivating_someone_closes_their_sessions(): void
    {
        $rosa = $this->api('POST', 'usuarios', $this->waiter())->json('data.id');
        $this->forget();
        $rosaToken = $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'rosa@donjose.pe', 'contrasena' => 'contrasena-rosa'])->json('data.token');

        $this->forget();
        $this->api('PATCH', "usuarios/{$rosa}", ['es_activo' => false])->assertOk()->assertJsonPath('data.es_activo', false);

        $this->forget();
        $this->withToken($rosaToken)->getJson($this->tenantUrl('donjose', 'auth/yo'))->assertUnauthorized();
    }

    public function test_the_last_admin_and_yourself_are_protected(): void
    {
        $me = $this->api('GET', 'usuarios')->json('data.0.id');
        $waiterRole = $this->roleId('Mozo');

        $this->api('PATCH', "usuarios/{$me}", ['es_activo' => false])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'ACCION_SOBRE_SI_MISMO');
        $this->api('PATCH', "usuarios/{$me}", ['rol_ids' => [$waiterRole]])
            ->assertJsonPath('error.codigo', 'ACCION_SOBRE_SI_MISMO');

        // Con dos administradores, uno puede desactivar al otro, pero nunca a sí mismo.
        $other = $this->api('POST', 'usuarios', $this->waiter(['correo' => 'socio@donjose.pe', 'rol_ids' => [$this->roleId('Administrador')]]))->json('data.id');
        $this->api('PATCH', "usuarios/{$other}", ['rol_ids' => [$waiterRole]])->assertOk();
        $this->api('PATCH', "usuarios/{$other}", ['rol_ids' => [$this->roleId('Administrador')]])->assertOk();

        $this->forget();
        $partner = $this->login('socio@donjose.pe');
        $this->withToken($partner)->patchJson($this->tenantUrl('donjose', "usuarios/{$me}"), ['es_activo' => false])->assertOk();

        $this->forget();
        $this->withToken($partner)->patchJson($this->tenantUrl('donjose', "usuarios/{$other}"), ['es_activo' => false])
            ->assertJsonPath('error.codigo', 'ACCION_SOBRE_SI_MISMO');
    }

    public function test_last_active_admin_cannot_be_removed_by_another_user(): void
    {
        // Un usuario con usuarios.* pero que no es administrador (rol creado a mano).
        $managerRole = $this->asTenant(function () {
            $role = DB::table('roles')->insertGetId(['inquilino_id' => $this->tenant->id, 'nombre' => 'Gerente', 'es_sistema' => false]);
            foreach (['usuarios.editar', 'usuarios.asignar_rol'] as $code) {
                DB::table('permiso_rol')->insert(['inquilino_id' => $this->tenant->id, 'rol_id' => $role, 'permiso_id' => DB::table('permisos')->where('codigo', $code)->value('id')]);
            }

            return $role;
        });
        $this->api('POST', 'usuarios', $this->waiter(['correo' => 'gerente@donjose.pe', 'rol_ids' => [$managerRole]]))->assertCreated();
        $admin = $this->api('GET', 'usuarios')->json('data.0.id');

        $this->forget();
        $this->withToken($this->login('gerente@donjose.pe'))->patchJson($this->tenantUrl('donjose', "usuarios/{$admin}"), ['es_activo' => false])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'ULTIMO_ADMINISTRADOR');
    }

    public function test_waiter_cannot_manage_the_team(): void
    {
        $this->api('POST', 'usuarios', $this->waiter())->assertCreated();
        $this->forget();
        $waiter = $this->login('rosa@donjose.pe');

        $this->withToken($waiter)->getJson($this->tenantUrl('donjose', 'usuarios'))->assertForbidden();
        $this->withToken($waiter)->postJson($this->tenantUrl('donjose', 'usuarios'), $this->waiter(['correo' => 'x@donjose.pe']))->assertForbidden();
        $this->withToken($waiter)->getJson($this->tenantUrl('donjose', 'roles'))->assertOk()->assertJsonCount(5, 'data');
    }

    public function test_plan_limit_on_active_users(): void
    {
        $this->asTenant(fn () => DB::table('suscripciones')->update([
            'plan_id' => DB::table('planes')->insertGetId(['codigo' => 'MINI', 'nombre' => 'Mini', 'precio_mensual' => 0, 'max_usuarios' => 2, 'max_sucursales' => 1]),
        ]));

        $this->api('POST', 'usuarios', $this->waiter())->assertCreated();
        $this->api('POST', 'usuarios', $this->waiter(['correo' => 'otro@donjose.pe']))
            ->assertStatus(429)
            ->assertJsonPath('error.codigo', 'LIMITE_PLAN_ALCANZADO');
    }

    public function test_pin_switches_user_on_a_device_with_a_session_and_closes_the_previous_one(): void
    {
        $rosa = $this->api('POST', 'usuarios', $this->waiter(['pin' => '4821']))->json('data.id');

        $this->api('GET', 'equipo/cambio')->assertJsonPath('data.0.nombre', 'Rosa Quispe')->assertJsonCount(1, 'data');

        $session = $this->api('POST', 'auth/pin', ['usuario_id' => $rosa, 'pin' => '4821', 'dispositivo' => 'Tablet salón'])
            ->assertOk()
            ->assertJsonPath('data.usuario.nombre', 'Rosa Quispe')
            ->json('data.token');

        $this->forget();
        $this->withToken($session)->getJson($this->tenantUrl('donjose', 'auth/yo'))->assertJsonPath('data.roles', ['Mozo']);

        $this->forget();
        $this->withToken($this->admin)->getJson($this->tenantUrl('donjose', 'auth/yo'))->assertUnauthorized();
    }

    public function test_wrong_pins_are_rejected_and_lock_the_user(): void
    {
        $rosa = $this->api('POST', 'usuarios', $this->waiter(['pin' => '4821']))->json('data.id');

        for ($i = 0; $i < 5; $i++) {
            $this->api('POST', 'auth/pin', ['usuario_id' => $rosa, 'pin' => '0000'])
                ->assertStatus(401)
                ->assertJsonPath('error.codigo', 'PIN_INVALIDO');
        }

        $this->api('POST', 'auth/pin', ['usuario_id' => $rosa, 'pin' => '4821'])
            ->assertStatus(429)
            ->assertJsonPath('error.codigo', 'BLOQUEO_POR_INTENTOS');
    }

    public function test_pin_requires_a_session_and_never_crosses_tenants(): void
    {
        $rosa = $this->api('POST', 'usuarios', $this->waiter(['pin' => '4821']))->json('data.id');

        $this->forget();
        $this->postJson($this->tenantUrl('donjose', 'auth/pin'), ['usuario_id' => $rosa, 'pin' => '4821'])->assertUnauthorized();

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->postJson($this->tenantUrl('otro', 'auth/pin'), ['usuario_id' => $rosa, 'pin' => '4821'])
            ->assertStatus(401)
            ->assertJsonPath('error.codigo', 'PIN_INVALIDO');

        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->patchJson($this->tenantUrl('otro', "usuarios/{$rosa}"), ['nombre' => 'X'])
            ->assertNotFound();
    }

    public function test_pin_is_set_and_removed(): void
    {
        $rosa = $this->api('POST', 'usuarios', $this->waiter())->json('data.id');

        $this->api('PUT', "usuarios/{$rosa}/pin", ['pin' => '12'])->assertStatus(422);
        $this->api('PUT', "usuarios/{$rosa}/pin", ['pin' => '123456'])->assertNoContent();
        $this->api('GET', 'usuarios')->assertJsonPath('data.1.tiene_pin', true);
        $this->api('DELETE', "usuarios/{$rosa}/pin")->assertNoContent();
        $this->api('GET', 'equipo/cambio')->assertJsonCount(0, 'data');
    }

    private function waiter(array $overrides = []): array
    {
        return $overrides + [
            'nombre' => 'Rosa Quispe',
            'correo' => 'rosa@donjose.pe',
            'contrasena' => 'contrasena-rosa',
            'rol_ids' => [$this->roleId('Mozo')],
        ];
    }

    private function roleId(string $name): int
    {
        return $this->asTenant(fn () => DB::table('roles')->where('nombre', $name)->value('id'));
    }

    private function login(string $email): string
    {
        return $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => $email, 'contrasena' => 'contrasena-rosa'])
            ->assertOk()
            ->json('data.token');
    }

    private function api(string $method, string $path, array $body = []): TestResponse
    {
        return $this->withToken($this->admin)->json($method, $this->tenantUrl('donjose', $path), $body);
    }

    private function forget(): void
    {
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
    }

    private function asTenant(callable $callback): mixed
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($this->tenant);

        try {
            return $callback();
        } finally {
            $context->clear();
        }
    }

    private function provision(string $slug): Tenant
    {
        $tenant = $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => 'RESTAURANTE', 'estado' => TenantStatus::Active],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
        $this->app->make(TenantContext::class)->clear();

        return $tenant;
    }

    private function tokenFor(Tenant $tenant, string $email): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        $token = User::where('correo', $email)->firstOrFail()->createToken('web')->plainTextToken;
        $context->clear();

        return $token;
    }
}
