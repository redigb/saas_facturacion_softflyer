<?php

namespace Tests\Feature\Restaurant;

use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 038: gastos de caja pagados con métodos digitales (Yape, Plin…).
 * No descuentan el efectivo del arqueo, pero sí se registran como egresos del turno.
 */
class CashMovementTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cashier;

    /** @var array<string, int> */
    private array $methods = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->methods = DB::table('metodos_pago')->pluck('id', 'codigo')->all();
    }

    public function test_digital_expenses_do_not_reduce_the_expected_cash(): void
    {
        $session = $this->openCash(100)->json('data.id');

        $this->movement($session, [
            'tipo' => 'EGRESO', 'monto' => 20, 'concepto' => 'Pago por Yape al proveedor',
            'categoria' => 'INSUMOS', 'metodo_pago_id' => $this->methods['YAPE'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.metodo_pago_id', $this->methods['YAPE'])
            ->assertJsonPath('data.efectivo_esperado', '100.00');

        // Un gasto en efectivo sí baja el arqueo.
        $this->movement($session, [
            'tipo' => 'EGRESO', 'monto' => 15, 'concepto' => 'Compra de gas',
            'categoria' => 'SERVICIOS', 'metodo_pago_id' => $this->methods['EFECTIVO'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.efectivo_esperado', '85.00');

        $this->as($this->cashier, 'GET', "sesiones-caja/{$session}/resumen")
            ->assertOk()
            ->assertJsonPath('data.resumen.egresos', '35.00')
            ->assertJsonPath('data.resumen.egresos_efectivo', '15.00')
            ->assertJsonPath('data.resumen.egresos_digital', '20.00')
            ->assertJsonPath('data.resumen.efectivo_esperado', '85.00')
            ->assertJsonPath('data.movimientos.0.metodo', 'Yape')
            ->assertJsonPath('data.movimientos.0.es_efectivo', false)
            ->assertJsonPath('data.movimientos.1.es_efectivo', true);

        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/cierre", ['monto_cierre_declarado' => 85])
            ->assertOk()
            ->assertJsonPath('data.monto_cierre_calculado', '85.00')
            ->assertJsonPath('data.diferencia', '0.00');
    }

    public function test_only_expenses_accept_a_digital_method(): void
    {
        $session = $this->openCash(10)->json('data.id');

        $this->movement($session, [
            'tipo' => 'INGRESO', 'monto' => 5, 'concepto' => 'Cobro digital',
            'categoria' => 'INGRESO', 'metodo_pago_id' => $this->methods['YAPE'],
        ])->assertStatus(422)->assertJsonStructure(['error' => ['detalles' => ['metodo_pago_id']]]);

        $this->movement($session, [
            'tipo' => 'EGRESO', 'monto' => 5, 'concepto' => 'Yape',
            'categoria' => 'OTROS', 'metodo_pago_id' => 32000,
        ])->assertStatus(422);
    }

    private function openCash(float|int $amount): TestResponse
    {
        return $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => $amount]);
    }

    /** @param array<string, mixed> $body */
    private function movement(int $session, array $body): TestResponse
    {
        return $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/movimientos", $body);
    }
}
