<?php

namespace Tests\Feature\Restaurant;

use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 010: comprobante simulado al cobrar (specs/010-comprobante-simulado/backend.md).
 */
class ReceiptTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cashier;

    private int $cashMethod;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->cashMethod = (int) DB::table('metodos_pago')->where('codigo', 'EFECTIVO')->value('id');
        $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();
    }

    public function test_charging_issues_a_numbered_boleta_to_clientes_varios(): void
    {
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 2]]);

        $receipt = $this->charge($order, 12)->assertCreated()->json('data.comprobante');

        $this->assertSame('BOLETA', $receipt['tipo']);
        $this->assertSame('B001', $receipt['serie']);
        $this->assertSame('B001-00000001', $receipt['numero']);
        $this->assertTrue($receipt['es_simulado']);
        $this->assertSame('CLIENTES VARIOS', $receipt['cliente']['nombre']);
        $this->assertSame('SIN_DOCUMENTO', $receipt['cliente']['tipo_documento']);
        $this->assertSame('12.00', $receipt['total']);
        $this->assertSame('1.83', $receipt['igv']);
        $this->assertSame('Pan al ajo', $receipt['lineas'][0]['descripcion']);
        $this->assertSame('Efectivo', $receipt['pagos'][0]['metodo']);
    }

    public function test_ruc_issues_a_factura_and_numbers_follow_each_series(): void
    {
        $first = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $second = $this->billedOrder($this->ids['m2'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);

        $boleta = $this->charge($first, 6)->assertCreated()->json('data.comprobante');
        $third = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $invoice = $this->charge($second, 6, ['tipo_documento' => 'RUC', 'numero' => '20100070970', 'nombre' => 'Supermercados Peruanos SA'])
            ->assertCreated()->json('data.comprobante');
        $next = $this->charge($third, 6, ['tipo_documento' => 'DNI', 'numero' => '45678912', 'nombre' => 'Ana Pérez'])
            ->assertCreated()->json('data.comprobante');

        $this->assertSame('B001-00000001', $boleta['numero']);
        $this->assertSame('FACTURA', $invoice['tipo']);
        $this->assertSame('F001-00000001', $invoice['numero']);
        $this->assertSame('RUC', $invoice['cliente']['tipo_documento']);
        $this->assertSame('Supermercados Peruanos SA', $invoice['cliente']['nombre']);
        $this->assertSame('BOLETA', $next['tipo']);
        $this->assertSame('B001-00000002', $next['numero']);
        $this->assertSame('DNI', $next['cliente']['tipo_documento']);
        $this->assertSame(1, DB::table('comprobantes')->where('venta_id', $invoice['venta_id'])->count());
    }

    public function test_an_invalid_customer_rejects_the_charge_without_charging(): void
    {
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);

        $this->charge($order, 6, ['tipo_documento' => 'RUC', 'numero' => '20100070971', 'nombre' => 'X SAC'])
            ->assertStatus(422)->assertJsonValidationErrorFor('cliente.numero', 'error.detalles');
        $this->charge($order, 6, ['tipo_documento' => 'RUC', 'numero' => '20100070970', 'nombre' => ''])
            ->assertStatus(422)->assertJsonValidationErrorFor('cliente.nombre', 'error.detalles');
        $this->charge($order, 6, ['tipo_documento' => 'DNI', 'numero' => '123'])
            ->assertStatus(422)->assertJsonValidationErrorFor('cliente.numero', 'error.detalles');

        $this->assertSame(0, DB::table('ventas')->count());
        $this->assertSame(0, DB::table('comprobantes')->count());
        $this->assertSame(0, DB::table('pagos')->count());
        $this->as($this->cashier, 'GET', "pedidos/{$order}")->assertJsonPath('data.estado', 'POR_COBRAR');
    }

    public function test_split_bill_issues_one_receipt_per_charge_and_they_are_listed_for_the_turn(): void
    {
        $order = $this->billedOrder($this->ids['m1'], [
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1],
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],
        ]);
        [$bread, $drink] = array_column($this->as($this->cashier, 'GET', "pedidos/{$order}")->json('data.detalles'), 'id');

        $this->charge($order, 6, null, [$bread])->assertCreated()->assertJsonPath('data.comprobante.numero', 'B001-00000001');
        $this->charge($order, 10, null, [$drink])->assertCreated()->assertJsonPath('data.comprobante.numero', 'B001-00000002');

        $list = $this->as($this->cashier, 'GET', 'comprobantes')->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame('B001-00000002', $list->json('data.0.numero')); // el más reciente primero

        $id = $list->json('data.1.id');
        $this->as($this->cashier, 'GET', "comprobantes/{$id}")->assertOk()->assertJsonPath('data.numero', 'B001-00000001')->assertJsonPath('data.lineas.0.descripcion', 'Pan al ajo');
    }

    public function test_waiter_cannot_read_receipts_and_other_branches_are_hidden(): void
    {
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $id = $this->charge($order, 6)->assertCreated()->json('data.comprobante.id');

        $this->as($this->waiter, 'GET', 'comprobantes')->assertForbidden();
        $this->as($this->waiter, 'GET', "comprobantes/{$id}")->assertForbidden();
    }

    public function test_the_billing_history_filters_searches_and_pages(): void
    {
        $this->charge($this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();
        $this->charge($this->billedOrder($this->ids['m2'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6, ['tipo_documento' => 'RUC', 'numero' => '20100070970', 'nombre' => 'Supermercados Peruanos SA'])->assertCreated();
        $this->charge($this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6, ['tipo_documento' => 'DNI', 'numero' => '45678912', 'nombre' => 'Ana Pérez'])->assertCreated();
        $today = now()->setTimezone('America/Lima')->toDateString();
        $tomorrow = now()->setTimezone('America/Lima')->addDay()->toDateString();

        $all = $this->as($this->cashier, 'GET', "comprobantes/historial?desde={$today}&hasta={$today}")->assertOk();
        $this->assertSame(['B001-00000002', 'F001-00000001', 'B001-00000001'], array_column($all->json('data'), 'numero'));
        $all->assertJsonPath('meta.total', 3)->assertJsonPath('data.0.sucursal', 'Local principal');

        $this->as($this->cashier, 'GET', 'comprobantes/historial?tipo=FACTURA')->assertJsonCount(1, 'data')->assertJsonPath('data.0.numero', 'F001-00000001');
        $this->as($this->cashier, 'GET', 'comprobantes/historial?estado=SIMULADOS')->assertJsonPath('meta.total', 3);
        $this->as($this->cashier, 'GET', 'comprobantes/historial?estado=ACEPTADOS')->assertJsonPath('meta.total', 0);
        $this->as($this->cashier, 'GET', 'comprobantes/historial?buscar=b001-1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.numero', 'B001-00000001');
        $this->as($this->cashier, 'GET', 'comprobantes/historial?buscar=Pérez')->assertJsonCount(1, 'data');
        $this->as($this->cashier, 'GET', 'comprobantes/historial?buscar=45678912')->assertJsonCount(1, 'data');
        $this->as($this->cashier, 'GET', "comprobantes/historial?desde={$tomorrow}")->assertJsonCount(0, 'data');
        $this->as($this->cashier, 'GET', 'comprobantes/historial?por_pagina=2&pagina=2')
            ->assertJsonCount(1, 'data')->assertJsonPath('meta.ultima_pagina', 2)->assertJsonPath('data.0.numero', 'B001-00000001');
        $this->as($this->cashier, 'GET', "comprobantes/historial?desde={$tomorrow}&hasta={$today}")->assertStatus(422);

        $this->as($this->waiter, 'GET', 'comprobantes/historial')->assertForbidden();
    }

    private function billedOrder(int $table, array $items): int
    {
        $order = $this->open($table)->json('data.id');
        $this->send($order, $items)->assertCreated();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();

        return $order;
    }

    /** @param  array<string, string>|null  $customer */
    private function charge(int $order, float|int $amount, ?array $customer = null, ?array $itemIds = null): TestResponse
    {
        $body = ['pagos' => [['metodo_pago_id' => $this->cashMethod, 'monto' => $amount]]]
            + ($customer ? ['cliente' => $customer] : [])
            + ($itemIds ? ['detalle_ids' => $itemIds] : []);

        return $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", $body, idempotent: true);
    }
}
