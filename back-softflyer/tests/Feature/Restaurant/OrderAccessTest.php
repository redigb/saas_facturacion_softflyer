<?php

namespace Tests\Feature\Restaurant;

use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 025: cada mozo atiende lo suyo; la jefatura (encargado/admin) puede con todo.
 */
class OrderAccessTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
    }

    public function test_a_waiter_cannot_operate_another_waiters_order(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');
        $otro = $this->user('Mozo', 'mozo2@donjose.pe');

        $this->as($otro, 'POST', "pedidos/{$order}/comandas", ['items' => [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]]], idempotent: true)
            ->assertStatus(403)
            ->assertJsonPath('error.codigo', 'PEDIDO_AJENO')
            ->assertJsonPath('error.detalles.mozo', 'Mozo');

        $this->as($otro, 'POST', "pedidos/{$order}/cuenta")
            ->assertStatus(403)
            ->assertJsonPath('error.codigo', 'PEDIDO_AJENO')
            ->assertJsonPath('error.detalles.mozo', 'Mozo');

        $this->as($otro, 'POST', "pedidos/{$order}/reabrir")
            ->assertStatus(403)
            ->assertJsonPath('error.codigo', 'PEDIDO_AJENO');

        $this->as($otro, 'POST', "pedidos/{$order}/anular")
            ->assertStatus(403)
            ->assertJsonPath('error.codigo', 'PEDIDO_AJENO');

        // Nada cambió y el dueño sigue mandando en su pedido.
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")
            ->assertOk()
            ->assertJsonPath('data.estado', 'POR_COBRAR');
    }

    public function test_the_encargado_and_the_admin_can_operate_any_order(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');
        $encargado = $this->user('Encargado de salón', 'encargado@donjose.pe');

        $this->as($encargado, 'POST', "pedidos/{$order}/cuenta")
            ->assertOk()
            ->assertJsonPath('data.estado', 'POR_COBRAR');

        $this->as($this->admin, 'POST', "pedidos/{$order}/reabrir")
            ->assertOk()
            ->assertJsonPath('data.estado', 'ABIERTO');

        $this->as($this->admin, 'POST', "pedidos/{$order}/comandas", ['items' => [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]]], idempotent: true)
            ->assertCreated()
            ->assertJsonPath('data.total', '10.00');
    }

    public function test_the_owner_keeps_operating_normally(): void
    {
        $order = $this->open($this->ids['m1'])->json('data.id');

        $this->send($order, [['producto_id' => $this->ids['lomo'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['jugoso']]]])
            ->assertCreated();

        // El dueño pasa el candado de dueño y llega a la regla de negocio (tiene envíos sin anular).
        $this->as($this->waiter, 'POST', "pedidos/{$order}/anular")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'PEDIDO_CON_ENVIOS');
    }
}
