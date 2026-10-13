<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Infrastructure\Realtime\DishReady;
use App\Modules\Restaurant\Infrastructure\Realtime\KitchenStatusUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\OrderUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\TicketSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 007: pantalla de cocina y "plato listo" (specs/007-cocina-kds/backend.md).
 */
class KitchenTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cook;

    private int $order;

    /** @var array<string, int> detalle por plato */
    private array $items = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->cook = $this->user('Cocinero', 'cocina@donjose.pe');

        // Mesa M1: 2 lomos (cocina), 1 chicha (bar) y 1 pan (sin estación → general).
        $this->order = $this->open($this->ids['m1'])->json('data.id');
        $details = $this->send($this->order, [
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 2, 'notas' => 'sin cebolla', 'modificador_ids' => [$this->ids['jugoso']]],
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1],
        ])->json('data.detalles');
        [$this->items['lomo'], $this->items['chicha'], $this->items['pan']] = array_column($details, 'id');
    }

    public function test_each_station_sees_only_its_tickets_without_prices(): void
    {
        $kitchen = $this->board($this->ids['cocina'])->assertOk()->assertJsonCount(1, 'data');
        $ticket = $kitchen->json('data.0');

        $this->assertSame('M1', $ticket['pedido']['mesa']);
        $this->assertSame('Mozo', $ticket['enviada_por']);
        $this->assertFalse($ticket['completa']);
        $this->assertSame(['Jugoso'], $ticket['detalles'][0]['modificadores']);
        $this->assertSame('sin cebolla', $ticket['detalles'][0]['notas']);
        $this->assertArrayNotHasKey('precio_unitario', $ticket['detalles'][0]);
        $this->assertStringNotContainsString('precio', $kitchen->getContent());

        $this->board($this->ids['bar'])->assertJsonCount(1, 'data')->assertJsonPath('data.0.detalles.0.nombre', 'Chicha morada');
        $this->board('general')->assertJsonCount(1, 'data')->assertJsonPath('data.0.detalles.0.nombre', 'Pan al ajo');
    }

    public function test_cook_advances_a_dish_and_its_waiter_is_told_it_is_ready(): void
    {
        Event::fake([KitchenStatusUpdated::class, DishReady::class, OrderUpdated::class]);

        $this->state($this->cook, $this->items['lomo'], 'EN_PREPARACION')->assertOk()->assertJsonPath('data.detalles.0.estado_cocina', 'EN_PREPARACION');
        Event::assertNotDispatched(DishReady::class);

        $this->state($this->cook, $this->items['lomo'], 'LISTO')
            ->assertOk()
            ->assertJsonPath('data.completa', true);

        $waiterId = $this->asTenant(fn () => User::where('correo', 'mozo@donjose.pe')->value('id'));
        Event::assertDispatched(DishReady::class, fn (DishReady $event) => $event->broadcastOn()->name === "private-sucursal.{$this->ids['sucursal']}.mozo.{$waiterId}"
            && $event->broadcastWith()['mesa'] === 'M1'
            && $event->broadcastWith()['platos'] === ['2× Lomo saltado']
            && $event->broadcastWith()['detalle_ids'] === [$this->items['lomo']]);
        Event::assertDispatched(KitchenStatusUpdated::class, fn (KitchenStatusUpdated $event) => $event->broadcastOn()->name === "private-sucursal.{$this->ids['sucursal']}.estacion.{$this->ids['cocina']}");
        Event::assertDispatched(OrderUpdated::class);

        // El mozo lo ve en su pedido y en el salón.
        $this->as($this->waiter, 'GET', "pedidos/{$this->order}")->assertJsonPath('data.detalles.0.estado_cocina', 'LISTO');
        $this->as($this->waiter, 'GET', 'pedidos')->assertJsonPath('data.0.listos', 1);
    }

    public function test_ready_tickets_stay_visible_to_undo_and_can_go_back_one_step(): void
    {
        $this->state($this->cook, $this->items['lomo'], 'LISTO')->assertOk();

        $this->board($this->ids['cocina'])->assertJsonCount(1, 'data')->assertJsonPath('data.0.completa', true);

        $this->state($this->cook, $this->items['lomo'], 'EN_PREPARACION')->assertOk()->assertJsonPath('data.completa', false);
        $this->state($this->cook, $this->items['lomo'], 'EN_PREPARACION')->assertOk(); // repetir no hace nada
        $this->state($this->cook, $this->items['lomo'], 'ENTREGADO')
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'TRANSICION_INVALIDA');
    }

    public function test_waiter_only_delivers_what_is_ready(): void
    {
        $this->state($this->waiter, $this->items['chicha'], 'LISTO')->assertForbidden();
        $this->state($this->waiter, $this->items['chicha'], 'ENTREGADO')->assertStatus(409)->assertJsonPath('error.codigo', 'TRANSICION_INVALIDA');

        $this->state($this->cook, $this->items['chicha'], 'LISTO')->assertOk();
        $this->state($this->waiter, $this->items['chicha'], 'ENTREGADO')->assertOk();
        $this->state($this->cook, $this->items['chicha'], 'LISTO')->assertStatus(409);

        // Entregado y sin pendientes: la comanda sale del tablero del bar.
        $this->board($this->ids['bar'])->assertJsonPath('data', []);
    }

    public function test_whole_ticket_ready_in_one_tap(): void
    {
        Event::fake([KitchenStatusUpdated::class, DishReady::class, OrderUpdated::class, TicketSent::class]);
        $more = $this->send($this->order, [['producto_id' => $this->ids['lomo'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['cocido']]]])->json('data.detalles.3.comanda.id');

        $this->as($this->cook, 'POST', "cocina/comandas/{$more}/listo")
            ->assertOk()
            ->assertJsonPath('data.completa', true)
            ->assertJsonPath('data.detalles.0.estado_cocina', 'LISTO');

        Event::assertDispatchedTimes(DishReady::class, 1);
    }

    public function test_voided_dishes_cannot_be_prepared(): void
    {
        $this->as($this->admin, 'POST', "pedidos/{$this->order}/detalles/{$this->items['pan']}/anular", ['motivo' => 'Se acabó el pan'])->assertOk();

        $this->board('general')->assertJsonPath('data', []); // sin platos vigentes pendientes
        $this->state($this->cook, $this->items['pan'], 'LISTO')
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'DETALLE_ANULADO');
    }

    public function test_cancelled_or_foreign_orders_are_not_on_the_board(): void
    {
        $waiterCantSee = $this->as($this->waiter, 'GET', "cocina/comandas?estacion_id={$this->ids['cocina']}");
        $waiterCantSee->assertForbidden();

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->patchJson($this->tenantUrl('otro', "cocina/detalles/{$this->items['lomo']}"), ['estado_cocina' => 'LISTO'])
            ->assertNotFound();
    }

    public function test_printing_marks_the_ticket_and_the_first_stamp_stays(): void
    {
        $ticket = $this->board($this->ids['cocina'])->json('data.0.id');

        $first = $this->markPrinted($ticket)->assertOk()->json('data.impresa_en');
        $this->assertNotNull($first);

        // Reimprimir no mueve la marca original.
        $this->assertSame($first, $this->markPrinted($ticket)->assertOk()->json('data.impresa_en'));
    }

    public function test_only_the_kitchen_or_the_admin_register_a_print(): void
    {
        $ticket = $this->board($this->ids['cocina'])->json('data.0.id');

        $this->as($this->waiter, 'POST', "cocina/comandas/{$ticket}/impresa")->assertForbidden();

        $this->as($this->admin, 'POST', "cocina/comandas/{$ticket}/impresa")
            ->assertOk()
            ->assertJsonPath('data.impresa_en', fn ($value) => $value !== null);
    }

    private function board(int|string $station): TestResponse
    {
        return $this->as($this->cook, 'GET', "cocina/comandas?estacion_id={$station}");
    }

    private function state(string $token, int $item, string $state): TestResponse
    {
        return $this->as($token, 'PATCH', "cocina/detalles/{$item}", ['estado_cocina' => $state]);
    }

    private function markPrinted(int $ticket): TestResponse
    {
        return $this->as($this->cook, 'POST', "cocina/comandas/{$ticket}/impresa");
    }
}
