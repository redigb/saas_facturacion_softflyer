<?php

namespace Tests\Feature\Restaurant;

use App\Modules\Restaurant\Infrastructure\Realtime\ItemVoided;
use App\Modules\Restaurant\Infrastructure\Realtime\OrderUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\TicketSent;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 006: pedidos del mozo (specs/006-pedidos-mozo/backend.md).
 */
class OrderTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
    }

    public function test_waiter_opens_a_table_and_it_becomes_occupied(): void
    {
        $this->open($this->ids['m1'], ['numero_comensales' => 3])
            ->assertCreated()
            ->assertJsonPath('data.numero', 1)
            ->assertJsonPath('data.tipo', 'SALON')
            ->assertJsonPath('data.estado', 'ABIERTO')
            ->assertJsonPath('data.mesa.codigo', 'M1')
            ->assertJsonPath('data.mozo.nombre', 'Mozo')
            ->assertJsonPath('data.total', '0.00');

        $this->open($this->ids['m2'])->assertJsonPath('data.numero', 2);
        $this->as($this->waiter, 'GET', "salones/{$this->ids['salon']}/plano")->assertJsonPath('data.mesas.0.estado', 'OCUPADA');
        $this->as($this->waiter, 'GET', 'pedidos')->assertJsonCount(2, 'data');
    }

    public function test_a_table_cannot_be_in_two_open_orders(): void
    {
        $first = $this->open($this->ids['m1'])->json('data.id');

        $this->open($this->ids['m1'])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'MESA_OCUPADA')
            ->assertJsonPath('error.detalles.pedido_id', $first);

        // Aunque la validación se salte, la base no deja dos pedidos activos en la mesa.
        $error = $this->asTenant(function () use ($first) {
            try {
                // Savepoint: la violación no aborta la transacción de la prueba.
                DB::transaction(fn () => DB::table('pedido_mesa')->insert([
                    'inquilino_id' => $this->tenant->id, 'pedido_id' => $first, 'mesa_id' => $this->ids['m1'], 'unida_en' => now(),
                ]));
            } catch (QueryException $e) {
                return $e->getCode();
            }

            return null;
        });
        $this->assertSame('23505', $error);
    }

    public function test_take_away_order_has_no_table(): void
    {
        $this->as($this->waiter, 'POST', 'pedidos', ['tipo' => 'PARA_LLEVAR'], idempotent: true)
            ->assertCreated()
            ->assertJsonPath('data.tipo', 'PARA_LLEVAR')
            ->assertJsonPath('data.mesa', null);

        $this->as($this->waiter, 'POST', 'pedidos', ['tipo' => 'PARA_LLEVAR', 'mesa_id' => $this->ids['m1']], idempotent: true)
            ->assertStatus(422);
    }

    public function test_sending_creates_one_ticket_per_station_with_frozen_prices(): void
    {
        Event::fake([TicketSent::class, OrderUpdated::class]);
        $order = $this->open($this->ids['m1'])->json('data.id');

        $response = $this->send($order, [
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 2, 'notas' => 'sin cebolla', 'modificador_ids' => [$this->ids['jugoso']]],
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],
        ])->assertCreated();

        $details = $response->json('data.detalles');
        $this->assertSame('ABIERTO', $response->json('data.estado'));
        $this->assertSame('100.00', $response->json('data.total')); // 2 × (42 + 3) + 10
        $this->assertSame('90.00', $details[0]['subtotal']);
        $this->assertSame('sin cebolla', $details[0]['notas']);
        $this->assertSame('PENDIENTE', $details[0]['estado_cocina']);
        $this->assertSame($this->ids['cocina'], $details[0]['comanda']['estacion_preparacion_id']);
        $this->assertSame($this->ids['bar'], $details[1]['comanda']['estacion_preparacion_id']);

        // El precio quedó congelado: cambiar la carta no altera el pedido.
        $this->as($this->admin, 'PATCH', "productos/{$this->ids['lomo']}", ['precio_venta' => 99]);
        $this->as($this->waiter, 'GET', "pedidos/{$order}")->assertJsonPath('data.total', '100.00');

        // Segunda tanda a cocina: comanda número 2 de esa estación.
        $second = $this->send($order, [['producto_id' => $this->ids['lomo'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['jugoso']]]]);
        $this->assertSame(2, $second->json('data.detalles.2.comanda.numero'));

        Event::assertDispatchedTimes(TicketSent::class, 3);
        Event::assertDispatched(TicketSent::class, fn (TicketSent $event) => $event->broadcastOn()->name === "private-sucursal.{$this->ids['sucursal']}.estacion.{$this->ids['bar']}");
        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => $event->broadcastWith()['mesa_ids'] === [$this->ids['m1']]);
    }

    public function test_dish_without_station_goes_to_the_general_ticket(): void
    {
        Event::fake([TicketSent::class, OrderUpdated::class]);
        $order = $this->open($this->ids['m1'])->json('data.id');

        $this->send($order, [['producto_id' => $this->ids['pan'], 'cantidad' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.detalles.0.comanda.estacion_preparacion_id', null);

        Event::assertDispatched(TicketSent::class, fn (TicketSent $event) => $event->broadcastOn()->name === "private-sucursal.{$this->ids['sucursal']}.estacion.general");
    }

    public function test_modifier_rules_and_unavailable_products_are_rejected(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');
        $this->as($this->admin, 'PATCH', "productos/{$this->ids['chicha']}", ['es_activo' => false]);

        $details = $this->send($order, [
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 1],                                                   // falta el término
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['jugoso'], $this->ids['cocido']]], // dos términos
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],                                                 // agotada
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['jugoso']]],        // opción ajena
        ])->assertStatus(422)->json('error.detalles');

        $this->assertStringContainsString('elige 1 en “Término”', $details['items.0.modificador_ids'][0]);
        $this->assertArrayHasKey('items.1.modificador_ids', $details);
        $this->assertStringContainsString('ya no está disponible', $details['items.2.producto_id'][0]);
        $this->assertArrayHasKey('items.3.modificador_ids', $details);

        $this->as($this->waiter, 'GET', "pedidos/{$order}")->assertJsonCount(0, 'data.detalles');
    }

    public function test_retrying_a_send_with_the_same_key_does_not_duplicate_the_ticket(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');
        $key = (string) Str::uuid();
        $body = ['items' => [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]]];

        $this->as($this->waiter, 'POST', "pedidos/{$order}/comandas", $body, key: $key)->assertCreated();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/comandas", $body, key: $key)
            ->assertCreated()
            ->assertHeader('Idempotency-Replayed', 'true');

        $this->as($this->waiter, 'GET', "pedidos/{$order}")->assertJsonCount(1, 'data.detalles');
        $this->assertSame(1, $this->asTenant(fn () => DB::table('comandas')->count()));
    }

    public function test_voiding_a_sent_dish_needs_permission_and_a_reason(): void
    {
        Event::fake([ItemVoided::class, TicketSent::class, OrderUpdated::class]);
        $order = $this->open($this->ids['m1'])->json('data.id');
        $item = $this->send($order, [['producto_id' => $this->ids['chicha'], 'cantidad' => 2]])->json('data.detalles.0.id');

        $this->as($this->waiter, 'POST', "pedidos/{$order}/detalles/{$item}/anular", ['motivo' => 'error'])->assertForbidden();

        $manager = $this->user('Encargado de salón', 'encargado@donjose.pe');
        $this->as($manager, 'POST', "pedidos/{$order}/detalles/{$item}/anular", [])->assertStatus(422);
        $this->as($manager, 'POST', "pedidos/{$order}/detalles/{$item}/anular", ['motivo' => 'El cliente cambió de idea'])
            ->assertOk()
            ->assertJsonPath('data.total', '0.00')
            ->assertJsonPath('data.detalles.0.anulado.motivo', 'El cliente cambió de idea')
            ->assertJsonPath('data.detalles.0.anulado.por', 'Encargado de salón');
        $this->as($manager, 'POST', "pedidos/{$order}/detalles/{$item}/anular", ['motivo' => 'otra vez'])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'DETALLE_YA_ANULADO');

        Event::assertDispatched(ItemVoided::class, fn (ItemVoided $event) => $event->broadcastWith()['detalle_id'] === $item);
    }

    public function test_bill_reopen_and_cancel(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');

        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk()->assertJsonPath('data.estado', 'POR_COBRAR');
        $this->as($this->waiter, 'GET', "salones/{$this->ids['salon']}/plano")->assertJsonPath('data.mesas.0.estado', 'POR_COBRAR');
        $this->send($order, [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'PEDIDO_NO_ABIERTO');

        $this->as($this->waiter, 'POST', "pedidos/{$order}/reabrir")->assertOk()->assertJsonPath('data.estado', 'ABIERTO');
        $item = $this->send($order, [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]])->json('data.detalles.0.id');

        $this->as($this->waiter, 'POST', "pedidos/{$order}/anular")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'PEDIDO_CON_ENVIOS');

        $this->as($this->admin, 'POST', "pedidos/{$order}/detalles/{$item}/anular", ['motivo' => 'Mesa equivocada'])->assertOk();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/anular")->assertOk()->assertJsonPath('data.estado', 'ANULADO');

        // La mesa quedó libre y se puede volver a abrir.
        $this->as($this->waiter, 'GET', "salones/{$this->ids['salon']}/plano")->assertJsonPath('data.mesas.0.estado', 'LIBRE');
        $this->open($this->ids['m1'])->assertCreated();
    }

    public function test_cook_cannot_take_orders_and_other_tenants_cannot_see_them(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');
        $cook = $this->user('Cocinero', 'cocina@donjose.pe');

        $this->as($cook, 'POST', 'pedidos', ['tipo' => 'SALON', 'mesa_id' => $this->ids['m2']], idempotent: true)->assertForbidden();
        $this->as($cook, 'GET', 'pedidos')->assertForbidden();

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))->getJson($this->tenantUrl('otro', "pedidos/{$order}"))->assertNotFound();
    }
}
