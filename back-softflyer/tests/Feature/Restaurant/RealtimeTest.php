<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Realtime\FloorPlanUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\MenuUpdated;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;

/**
 * Spec 005: canales privados y eventos en tiempo real (specs/005-tiempo-real/backend.md).
 */
class RealtimeTest extends DatabaseTestCase
{
    private Tenant $tenant;

    private int $branch;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);
        $this->useReverb(port: 6001);

        $this->tenant = $this->provision('donjose');
        $this->branch = $this->asTenant($this->tenant, fn () => DB::table('sucursales')->value('id'));
        $this->admin = $this->tokenFor($this->tenant, 'admin@donjose.pe');
    }

    public function test_profile_lists_the_branches_of_the_user(): void
    {
        $this->withToken($this->admin)->getJson($this->tenantUrl('donjose', 'auth/yo'))
            ->assertJsonPath('data.sucursales', [['id' => $this->branch, 'nombre' => 'Local principal']]);
    }

    public function test_staff_subscribe_to_their_branch_room_channel(): void
    {
        $this->authorize($this->admin, "sucursal.{$this->branch}.salon")
            ->assertOk()
            ->assertJsonStructure(['auth']);

        $this->authorize($this->user('Mozo', 'mozo@donjose.pe'), "sucursal.{$this->branch}.salon")->assertOk();
    }

    public function test_nobody_subscribes_to_another_tenant_or_without_session(): void
    {
        $other = $this->provision('otro');
        $otherBranch = $this->asTenant($other, fn () => DB::table('sucursales')->value('id'));
        $otherAdmin = $this->tokenFor($other, 'admin@otro.pe');

        // Mismo id de sucursal pedido desde el otro restaurante: para RLS no existe.
        $this->authorize($otherAdmin, "sucursal.{$this->branch}.salon", 'otro')->assertForbidden();
        $this->authorize($this->admin, "sucursal.{$otherBranch}.salon")->assertForbidden();

        $this->forget();
        $this->postJson($this->tenantUrl('donjose', 'broadcasting/auth'), ['socket_id' => '1.1', 'channel_name' => "private-sucursal.{$this->branch}.salon"])
            ->assertUnauthorized();
    }

    public function test_channels_are_authorized_in_one_batch_and_denied_ones_come_back_null(): void
    {
        $waiter = $this->user('Mozo', 'mozo@donjose.pe', branch: $this->branch);
        $waiterId = $this->asTenant($this->tenant, fn () => User::where('correo', 'mozo@donjose.pe')->value('id'));

        $response = $this->batch($waiter, ["sucursal.{$this->branch}.salon", "sucursal.{$this->branch}.mozo.{$waiterId}", "sucursal.{$this->branch}.mozo.".($waiterId + 999), 'sucursal.999999.salon'])
            ->assertOk();

        // Los nombres de canal llevan puntos: se leen del arreglo, no con notación de puntos.
        $data = $response->json('data');
        $this->assertStringStartsWith('clave-prueba:', $data["private-sucursal.{$this->branch}.salon"]['auth']);
        $this->assertStringStartsWith('clave-prueba:', $data["private-sucursal.{$this->branch}.mozo.{$waiterId}"]['auth']);
        $this->assertNull($data["private-sucursal.{$this->branch}.mozo.".($waiterId + 999)]);
        $this->assertNull($data['private-sucursal.999999.salon']);
    }

    public function test_batch_needs_a_session_other_tenants_get_nothing_and_it_is_capped(): void
    {
        $other = $this->provision('otro');
        $otherAdmin = $this->tokenFor($other, 'admin@otro.pe');
        $this->forget();
        $this->withToken($otherAdmin)->postJson($this->tenantUrl('otro', 'broadcasting/auth/lote'), ['socket_id' => '1.1', 'canales' => ["private-sucursal.{$this->branch}.salon"]])
            ->assertOk()
            ->assertExactJson(['data' => ["private-sucursal.{$this->branch}.salon" => null]]);

        $this->batch($this->admin, array_map(fn (int $n) => "sucursal.{$n}.salon", range(1, 21)))->assertStatus(422);

        $this->forget();
        $this->postJson($this->tenantUrl('donjose', 'broadcasting/auth/lote'), ['socket_id' => '1.1', 'canales' => ['private-sucursal.1.salon']])
            ->assertUnauthorized();
    }

    public function test_branch_scoped_role_cannot_listen_to_another_branch(): void
    {
        $second = $this->asTenant($this->tenant, fn () => DB::table('sucursales')->insertGetId([
            'inquilino_id' => $this->tenant->id,
            'empresa_id' => DB::table('empresas')->value('id'),
            'nombre' => 'Segundo local',
        ]));
        $waiter = $this->user('Mozo', 'mozo@donjose.pe', branch: $this->branch);

        $this->authorize($waiter, "sucursal.{$this->branch}.salon")->assertOk();
        $this->authorize($waiter, "sucursal.{$second}.salon")->assertForbidden();
    }

    public function test_waiter_channel_is_private_to_that_waiter(): void
    {
        $waiter = $this->user('Mozo', 'mozo@donjose.pe');
        $waiterId = $this->asTenant($this->tenant, fn () => User::where('correo', 'mozo@donjose.pe')->value('id'));
        $otherWaiter = $this->user('Mozo', 'mozo2@donjose.pe');

        $this->authorize($waiter, "sucursal.{$this->branch}.mozo.{$waiterId}")->assertOk();
        $this->authorize($otherWaiter, "sucursal.{$this->branch}.mozo.{$waiterId}")->assertForbidden();
    }

    public function test_station_channel_is_for_kitchen_and_needs_an_existing_station(): void
    {
        $station = $this->api('POST', 'estaciones', ['nombre' => 'Cocina'])->json('data.id');
        $bar = $this->api('POST', 'estaciones', ['nombre' => 'Bar'])->json('data.id');
        $cook = $this->user('Cocinero', 'cocina@donjose.pe');
        $cookId = $this->asTenant($this->tenant, fn () => User::where('correo', 'cocina@donjose.pe')->value('id'));
        $waiter = $this->user('Mozo', 'mozo@donjose.pe');
        $this->api('PUT', "cocina/accesos/{$cookId}", ['estacion_ids' => [$station], 'general' => false])->assertOk();

        $this->authorize($cook, "sucursal.{$this->branch}.estacion.{$station}")->assertOk();
        $this->authorize($cook, "sucursal.{$this->branch}.estacion.{$bar}")->assertForbidden();
        $this->authorize($cook, "sucursal.{$this->branch}.estacion.general")->assertForbidden();
        $this->authorize($waiter, "sucursal.{$this->branch}.estacion.{$station}")->assertForbidden();
        $this->authorize($cook, "sucursal.{$this->branch}.estacion.999999")->assertForbidden();
        $this->authorize($this->admin, "sucursal.{$this->branch}.estacion.{$bar}")->assertOk();
    }

    public function test_saving_the_plan_and_changing_the_menu_broadcast_ids_only(): void
    {
        Event::fake([FloorPlanUpdated::class, MenuUpdated::class]);

        $room = $this->api('POST', 'salones', ['nombre' => 'Salón'])->json('data.id');
        $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [], 'elementos' => []])->assertOk();
        $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->assertCreated();
        $this->api('POST', 'categorias', ['nombre' => 'FONDOS'])->assertStatus(422);
        $this->api('GET', 'categorias')->assertOk();

        Event::assertDispatched(FloorPlanUpdated::class, function (FloorPlanUpdated $event) use ($room) {
            return $event->broadcastOn()->name === "private-sucursal.{$this->branch}.salon"
                && $event->broadcastAs() === 'PlanoActualizado'
                && $event->broadcastWith() === ['salon_id' => $room, 'version' => 2, 'usuario_id' => $this->adminId()];
        });

        // Solo la escritura exitosa avisa: ni el 422 ni la lectura.
        Event::assertDispatchedTimes(MenuUpdated::class, 1);
        Event::assertDispatched(MenuUpdated::class, fn (MenuUpdated $event) => $event->broadcastOn()[0]->name === "private-sucursal.{$this->branch}.salon"
            && $event->broadcastAs() === 'CartaActualizada'
            && $event->broadcastWith() === ['usuario_id' => $this->adminId()]);
    }

    public function test_saving_still_works_when_reverb_is_down(): void
    {
        // Puerto sin servidor: el envío falla y ShouldRescue lo registra sin romper la operación.
        $this->useReverb(port: 1);
        $room = $this->api('POST', 'salones', ['nombre' => 'Salón'])->json('data.id');

        $this->api('PUT', "salones/{$room}/plano", ['version' => 1, 'mesas' => [], 'elementos' => []])
            ->assertOk()
            ->assertJsonPath('data.salon.version', 2);
        $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->assertCreated();
    }

    /** Las pruebas usan el driver `null`; aquí se activa Reverb y se registran sus canales. */
    private function useReverb(int $port): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'clave-prueba',
            'broadcasting.connections.reverb.secret' => 'secreto-prueba',
            'broadcasting.connections.reverb.app_id' => 'softflyer',
            'broadcasting.connections.reverb.options' => ['host' => '127.0.0.1', 'port' => $port, 'scheme' => 'http', 'useTLS' => false],
        ]);
        $this->app->make(BroadcastManager::class)->forgetDrivers();
        require app_path('Modules/Restaurant/Presentation/channels.php');
    }

    private function authorize(string $token, string $channel, string $slug = 'donjose'): TestResponse
    {
        $this->forget();

        return $this->withToken($token)->postJson($this->tenantUrl($slug, 'broadcasting/auth'), [
            'socket_id' => '1234.5678',
            'channel_name' => "private-{$channel}",
        ]);
    }

    /** @param list<string> $channels */
    private function batch(string $token, array $channels): TestResponse
    {
        $this->forget();

        return $this->withToken($token)->postJson($this->tenantUrl('donjose', 'broadcasting/auth/lote'), [
            'socket_id' => '1234.5678',
            'canales' => array_map(fn (string $channel) => "private-{$channel}", $channels),
        ]);
    }

    private function api(string $method, string $path, array $body = []): TestResponse
    {
        $this->forget();

        return $this->withToken($this->admin)->json($method, $this->tenantUrl('donjose', $path), $body);
    }

    private function adminId(): int
    {
        return $this->asTenant($this->tenant, fn () => User::where('correo', 'admin@donjose.pe')->value('id'));
    }

    private function user(string $role, string $email, ?int $branch = null): string
    {
        return $this->asTenant($this->tenant, function () use ($role, $email, $branch) {
            $user = User::create(['nombre' => $role, 'correo' => $email, 'contrasena' => 'contrasena-segura']);
            DB::table('rol_usuario')->insert([
                'inquilino_id' => $this->tenant->id,
                'usuario_id' => $user->id,
                'rol_id' => DB::table('roles')->where('nombre', $role)->value('id'),
                'sucursal_id' => $branch,
            ]);

            return $user->createToken('web')->plainTextToken;
        });
    }

    private function forget(): void
    {
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
    }

    private function asTenant(Tenant $tenant, callable $callback): mixed
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);

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
        return $this->asTenant($tenant, fn () => User::where('correo', $email)->firstOrFail()->createToken('web')->plainTextToken);
    }
}
