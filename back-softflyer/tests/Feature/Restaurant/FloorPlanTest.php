<?php

namespace Tests\Feature\Restaurant;

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
 * Spec 003: contrato del plano del salón (specs/003-plano/backend.md).
 */
class FloorPlanTest extends DatabaseTestCase
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

    public function test_owner_creates_rooms_in_the_main_branch(): void
    {
        $this->api('POST', 'salones', ['nombre' => 'Salón principal'])
            ->assertCreated()
            ->assertJsonPath('data.ancho', 1000)
            ->assertJsonPath('data.alto', 700)
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.mesas_count', 0)
            ->assertJsonPath('data.es_activo', true);

        $this->api('POST', 'salones', ['nombre' => 'Terraza', 'ancho' => 800, 'alto' => 500])->assertCreated();

        $this->api('POST', 'salones', ['nombre' => 'TERRAZA'])
            ->assertStatus(422)
            ->assertJsonPath('error.detalles.nombre.0', 'Ya tienes un salón con ese nombre.');

        $this->assertSame(['Salón principal', 'Terraza'], array_column($this->api('GET', 'salones')->json('data'), 'nombre'));
    }

    public function test_plan_is_saved_as_a_whole_and_version_increases(): void
    {
        $room = $this->room();

        $this->api('PUT', "salones/{$room}/plano", [
            'version' => 1,
            'mesas' => [$this->table('m1'), $this->table('M2', ['forma' => 'REDONDA', 'capacidad' => 2])],
            'elementos' => [['tipo' => 'BARRA', 'etiqueta' => 'Barra', 'pos_x' => 700, 'pos_y' => 50, 'ancho' => 200, 'alto' => 60, 'rotacion' => 0]],
        ])
            ->assertOk()
            ->assertJsonPath('data.salon.version', 2)
            ->assertJsonPath('data.mesas.0.codigo', 'M1')
            ->assertJsonPath('data.mesas.0.estado', 'LIBRE')
            ->assertJsonPath('data.mesas.1.forma', 'REDONDA')
            ->assertJsonPath('data.elementos.0.tipo', 'BARRA');

        $plan = $this->api('GET', "salones/{$room}/plano")->assertOk();
        $this->assertSame(80, $plan->json('data.mesas.0.pos_x'));
        $this->assertCount(2, $plan->json('data.mesas'));
        $this->assertSame(2, $this->api('GET', 'salones')->json('data.0.mesas_count'));
    }

    public function test_stale_version_is_rejected_without_changing_anything(): void
    {
        $room = $this->room();
        $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [$this->table('M1')], 'elementos' => []])->assertOk();

        $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [], 'elementos' => []])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'PLANO_DESACTUALIZADO')
            ->assertJsonPath('error.detalles.version_actual', 2);

        $this->api('GET', "salones/{$room}/plano")->assertJsonCount(1, 'data.mesas');
    }

    public function test_removed_tables_are_deactivated_and_reactivated_by_code(): void
    {
        $room = $this->room();
        $saved = $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [$this->table('M1'), $this->table('M2')], 'elementos' => []]);
        [$m1, $m2] = array_column($saved->json('data.mesas'), 'id');

        // Se quita M2: no se borra, se desactiva.
        $this->api('PUT', "salones/{$room}/plano", ['version' => 2, 'mesas' => [$this->table('M1', ['id' => $m1])], 'elementos' => []])
            ->assertJsonCount(1, 'data.mesas');
        $this->assertSame(2, $this->asTenant(fn () => DB::table('mesas')->where('salon_id', $room)->count()));

        // Se vuelve a crear M2: es la misma mesa (mismo id), reactivada.
        $this->api('PUT', "salones/{$room}/plano", ['version' => 3, 'mesas' => [$this->table('M1', ['id' => $m1]), $this->table('M2')], 'elementos' => []])
            ->assertJsonPath('data.mesas.1.id', $m2);
    }

    public function test_table_codes_can_be_swapped(): void
    {
        $room = $this->room();
        $saved = $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [$this->table('M1'), $this->table('M2')], 'elementos' => []]);
        [$m1, $m2] = array_column($saved->json('data.mesas'), 'id');

        $this->api('PUT', "salones/{$room}/plano", [
            'version' => 2,
            'mesas' => [$this->table('M2', ['id' => $m1]), $this->table('M1', ['id' => $m2])],
            'elementos' => [],
        ])
            ->assertOk()
            ->assertJsonPath('data.mesas.0.codigo', 'M2')
            ->assertJsonPath('data.mesas.1.codigo', 'M1');
    }

    public function test_busy_tables_cannot_be_removed(): void
    {
        $room = $this->room();
        $saved = $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [$this->table('M1')], 'elementos' => []]);
        $this->asTenant(fn () => DB::table('mesas')->where('id', $saved->json('data.mesas.0.id'))->update(['estado' => 'OCUPADA']));

        $this->api('PUT', "salones/{$room}/plano", ['version' => 2, 'mesas' => [], 'elementos' => []])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'MESA_EN_USO')
            ->assertJsonPath('error.detalles.mesas', ['M1']);

        $this->api('DELETE', "salones/{$room}")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'SALON_EN_USO');
    }

    public function test_validation_rejects_duplicates_and_objects_outside_the_room(): void
    {
        $room = $this->room();

        $details = $this->api('PUT', "salones/{$room}/plano", [
            'version' => 1,
            'mesas' => [$this->table('M1'), $this->table('m1'), $this->table('M3', ['pos_x' => 1500])],
            'elementos' => [['tipo' => 'NAVE', 'pos_x' => 0, 'pos_y' => 0, 'ancho' => 10, 'alto' => 10, 'rotacion' => 0]],
        ])->assertStatus(422)->json('error.detalles');

        $this->assertSame(['Hay dos mesas con el mismo código.'], $details['mesas.1.codigo']);
        $this->assertArrayHasKey('mesas.2.pos_x', $details);
        $this->assertArrayHasKey('elementos.0.tipo', $details);
    }

    public function test_waiter_reads_the_plan_but_cannot_edit_it(): void
    {
        $room = $this->room();
        $waiter = $this->createWaiter();

        $this->withToken($waiter)->getJson($this->tenantUrl('donjose', "salones/{$room}/plano"))->assertOk();
        $this->withToken($waiter)->putJson($this->tenantUrl('donjose', "salones/{$room}/plano"), ['version' => 1, 'mesas' => [], 'elementos' => []])
            ->assertForbidden();
        $this->withToken($waiter)->postJson($this->tenantUrl('donjose', 'salones'), ['nombre' => 'Otro'])->assertForbidden();
    }

    public function test_another_tenant_room_is_not_found(): void
    {
        $room = $this->room();
        $other = $this->provision('otro');
        $this->app['auth']->forgetGuards();
        $token = $this->tokenFor($other, 'admin@otro.pe');

        $this->withToken($token)->getJson($this->tenantUrl('otro', "salones/{$room}/plano"))->assertNotFound();
        $this->withToken($token)->putJson($this->tenantUrl('otro', "salones/{$room}/plano"), ['version' => 1, 'mesas' => [], 'elementos' => []])
            ->assertNotFound();
        $this->withToken($token)->getJson($this->tenantUrl('otro', 'salones'))->assertJsonCount(0, 'data');
    }

    public function test_rooms_are_renamed_reordered_and_deleted(): void
    {
        $a = $this->room('Salón');
        $b = $this->room('Terraza');

        $this->api('PATCH', "salones/{$a}", ['nombre' => 'Salón principal', 'es_activo' => false])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Salón principal')
            ->assertJsonPath('data.es_activo', false);

        $this->api('PUT', 'salones/orden', ['ids' => [$b, $a]])->assertNoContent();
        $this->assertSame([$b, $a], array_column($this->api('GET', 'salones')->json('data'), 'id'));

        $this->api('DELETE', "salones/{$b}")->assertNoContent();
        $this->api('GET', 'salones')->assertJsonCount(1, 'data');
    }

    private function room(string $name = 'Salón principal'): int
    {
        return $this->api('POST', 'salones', ['nombre' => $name])->assertCreated()->json('data.id');
    }

    private function table(string $code, array $overrides = []): array
    {
        return $overrides + [
            'codigo' => $code, 'capacidad' => 4, 'forma' => 'CUADRADA',
            'pos_x' => 80, 'pos_y' => 80, 'ancho' => 110, 'alto' => 110, 'rotacion' => 0,
        ];
    }

    private function api(string $method, string $path, array $body = []): TestResponse
    {
        return $this->withToken($this->admin)->json($method, $this->tenantUrl('donjose', $path), $body);
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

    private function createWaiter(): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($this->tenant);

        $waiter = User::create(['nombre' => 'Mozo', 'correo' => 'mozo@donjose.pe', 'contrasena' => 'contrasena-segura']);
        DB::table('rol_usuario')->insert([
            'inquilino_id' => $this->tenant->id,
            'usuario_id' => $waiter->id,
            'rol_id' => DB::table('roles')->where('nombre', 'Mozo')->value('id'),
        ]);
        $context->clear();
        $this->app['auth']->forgetGuards();

        return $waiter->createToken('web')->plainTextToken;
    }
}
