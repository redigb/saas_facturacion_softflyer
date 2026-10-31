<?php

namespace Tests\Feature\Restaurant;

use App\Core\Cash\Infrastructure\Realtime\CashUpdated;
use App\Core\Iam\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 009: caja y cobro (specs/009-caja-cobro/backend.md).
 */
class ChargeTest extends DatabaseTestCase
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

    public function test_operational_payment_methods_are_available_for_the_modal(): void
    {
        $this->as($this->cashier, 'GET', 'metodos-pago')
            ->assertOk()
            ->assertJsonFragment(['codigo' => 'PERSONAL', 'nombre' => 'Personal', 'es_efectivo' => false])
            ->assertJsonFragment(['codigo' => 'APPS_DELIVERY', 'nombre' => 'Apps de delivery', 'es_efectivo' => false]);
    }

    public function test_cashier_opens_one_turn_and_cannot_open_a_second(): void
    {
        $this->as($this->cashier, 'GET', 'sesiones-caja/actual')->assertOk()->assertJsonPath('data', null);

        $this->openCash(100)->assertCreated()
            ->assertJsonPath('data.estado', 'ABIERTA')
            ->assertJsonPath('data.monto_apertura', '100.00')
            ->assertJsonPath('data.caja.nombre', 'Caja principal');

        $this->as($this->cashier, 'GET', 'sesiones-caja/actual')->assertJsonPath('data.estado', 'ABIERTA');
        $this->openCash(50)->assertStatus(409)->assertJsonPath('error.codigo', 'CAJA_YA_ABIERTA');

        // Otra persona tampoco abre la misma caja mientras está ocupada.
        $other = $this->user('Cajero', 'caja2@donjose.pe');
        $this->as($other, 'POST', 'sesiones-caja', ['monto_apertura' => 10])->assertStatus(409)->assertJsonPath('error.codigo', 'CAJA_YA_ABIERTA');
    }

    public function test_waiter_cannot_open_cash_or_charge(): void
    {
        $this->as($this->waiter, 'POST', 'sesiones-caja', ['monto_apertura' => 10])->assertForbidden();

        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cobro", $this->cash(6), idempotent: true)->assertForbidden();
        $this->as($this->waiter, 'GET', 'pedidos/por-cobrar')->assertForbidden();
    }

    public function test_charging_needs_an_open_turn(): void
    {
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);

        $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", $this->cash(6), idempotent: true)
            ->assertStatus(409)->assertJsonPath('error.codigo', 'SIN_TURNO_ABIERTO');
    }

    public function test_full_charge_with_mixed_methods_closes_the_order_and_frees_the_table(): void
    {
        $this->openCash(100);
        // Lomo jugoso 42 + 3 = 45, chicha 10 → 55.00
        $order = $this->billedOrder($this->ids['m1'], [
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 1, 'modificador_ids' => [$this->ids['jugoso']]],
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],
        ]);

        $this->as($this->cashier, 'GET', 'pedidos/por-cobrar')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $order);
        $this->as($this->cashier, 'GET', "pedidos/{$order}")->assertOk()->assertJsonPath('data.pendiente', '55.00');

        $response = $this->charge($order, [
            ['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 30, 'monto_recibido' => 50],
            ['metodo_pago_id' => $this->methods['YAPE'], 'monto' => 25, 'referencia' => 'OP-84211'],
        ])->assertCreated();

        $response->assertJsonPath('data.venta.total', '55.00')
            ->assertJsonPath('data.venta.igv', '8.39')
            ->assertJsonPath('data.vuelto', '20.00')
            ->assertJsonPath('data.pedido.estado', 'CERRADO')
            ->assertJsonPath('data.pedido.pendiente', '0.00')
            ->assertJsonCount(2, 'data.pagos');

        $this->as($this->waiter, 'GET', "salones/{$this->ids['salon']}/plano")->assertJsonPath('data.mesas.0.estado', 'LIBRE');
        $this->as($this->cashier, 'GET', 'pedidos/por-cobrar')->assertJsonCount(0, 'data');
        $this->assertSame(1, DB::table('ventas')->count());
        $this->assertSame(2, DB::table('detalle_ventas')->count());
        $this->assertSame(2, DB::table('venta_detalle_pedido')->count());
    }

    public function test_a_retry_with_the_same_key_does_not_charge_twice(): void
    {
        $this->openCash(0);
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 2]]);
        $key = (string) Str::uuid();

        $first = $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", $this->cash(12), key: $key)->assertCreated();
        $second = $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", $this->cash(12), key: $key)->assertCreated();

        $this->assertSame($first->json('data.venta.id'), $second->json('data.venta.id'));
        $this->assertSame(1, DB::table('ventas')->count());
        $this->assertSame(1, DB::table('pagos')->count());
    }

    public function test_split_bill_charges_each_diner_and_closes_when_everything_is_paid(): void
    {
        $this->openCash(0);
        $order = $this->billedOrder($this->ids['m1'], [
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1],
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1],
        ]);
        [$bread, $drink] = array_column($this->as($this->cashier, 'GET', "pedidos/{$order}")->json('data.detalles'), 'id');

        $this->charge($order, [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 6]], [$bread])
            ->assertCreated()
            ->assertJsonPath('data.pedido.estado', 'POR_COBRAR')
            ->assertJsonPath('data.pedido.pendiente', '10.00');

        $detail = $this->as($this->cashier, 'GET', "pedidos/{$order}")->assertJsonPath('data.pendiente', '10.00');
        $this->assertTrue($detail->json('data.detalles.0.cobrado'));
        $this->assertFalse($detail->json('data.detalles.1.cobrado'));

        // El mismo plato no se cobra dos veces.
        $this->charge($order, [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 6]], [$bread])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'DETALLE_YA_COBRADO');

        $this->charge($order, [['metodo_pago_id' => $this->methods['TARJETA_DEBITO'], 'monto' => 10]], [$drink])
            ->assertCreated()
            ->assertJsonPath('data.pedido.estado', 'CERRADO');
        $this->assertSame(2, DB::table('ventas')->count());
    }

    public function test_payments_must_cover_the_total_and_the_order_must_be_waiting_for_payment(): void
    {
        $this->openCash(0);
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);

        $this->charge($order, [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 5]])
            ->assertStatus(422)->assertJsonPath('error.codigo', 'PAGO_NO_CUBRE_TOTAL')->assertJsonPath('error.detalles.falta', '1.00');
        $this->charge($order, [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 6, 'monto_recibido' => 5]])
            ->assertStatus(422)->assertJsonValidationErrorFor('pagos.0.monto_recibido', 'error.detalles');
        $this->assertSame(0, DB::table('ventas')->count());

        $open = $this->open($this->ids['m2'])->json('data.id');
        $this->charge($open, [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 6]])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'PEDIDO_NO_COBRABLE');
    }

    public function test_takeaway_of_a_table_is_charged_in_the_same_receipt(): void
    {
        $this->openCash(0);
        // Mesa: pan 6.00 · Para llevar de la misma mesa: chicha 10.00
        $table = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $takeaway = $this->as($this->waiter, 'POST', 'pedidos', [
            'tipo' => 'PARA_LLEVAR',
            'mesa_referencia_id' => $this->ids['m1'],
        ], idempotent: true)->assertCreated()->json('data.id');
        $this->send($takeaway, [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]])->assertCreated();

        // El para llevar no se cobra por separado: viaja con la cuenta de la mesa.
        $this->as($this->cashier, 'GET', 'pedidos/por-cobrar')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $table);

        $detail = $this->as($this->cashier, 'GET', "pedidos/{$table}")->assertOk()->assertJsonCount(1, 'data.acompanantes');
        $tableItems = array_column($detail->json('data.detalles'), 'id');
        $takeawayItems = array_column($detail->json('data.acompanantes.0.detalles'), 'id');

        $this->as($this->cashier, 'POST', "pedidos/{$table}/cobro", [
            'detalle_ids' => [...$tableItems, ...$takeawayItems],
            'pedidos_adicionales' => [$takeaway],
            'pagos' => [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 16]],
        ], idempotent: true)
            ->assertCreated()
            ->assertJsonPath('data.venta.total', '16.00')
            ->assertJsonPath('data.pedido.estado', 'CERRADO')
            ->assertJsonCount(2, 'data.pedidos');

        $this->assertSame(1, DB::table('ventas')->count());
        $this->assertSame(1, DB::table('comprobantes')->count());
        $this->assertSame(2, DB::table('venta_detalle_pedido')->count());
        $this->assertSame('CERRADO', $this->asTenant(fn () => DB::table('pedidos')->where('id', $takeaway)->value('estado')));
        $this->as($this->waiter, 'GET', "salones/{$this->ids['salon']}/plano")->assertJsonPath('data.mesas.0.estado', 'LIBRE');

        // El resumen de caja muestra una sola orden con la mesa.
        $session = $this->as($this->cashier, 'GET', 'sesiones-caja/actual')->json('data.id');
        $this->as($this->cashier, 'GET', "sesiones-caja/{$session}/resumen")
            ->assertJsonCount(1, 'data.resumen.ordenes')
            ->assertJsonPath('data.resumen.ordenes.0.mesa', 'M1')
            ->assertJsonPath('data.resumen.ordenes.0.total', '16.00');
    }

    public function test_a_takeaway_of_another_table_cannot_join_the_bill(): void
    {
        $this->openCash(0);
        $table = $this->billedOrder($this->ids['m2'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $takeaway = $this->as($this->waiter, 'POST', 'pedidos', [
            'tipo' => 'PARA_LLEVAR',
            'mesa_referencia_id' => $this->ids['m1'],
        ], idempotent: true)->assertCreated()->json('data.id');
        $this->send($takeaway, [['producto_id' => $this->ids['chicha'], 'cantidad' => 1]])->assertCreated();

        $this->as($this->cashier, 'POST', "pedidos/{$table}/cobro", [
            'pedidos_adicionales' => [$takeaway],
            'pagos' => [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 6]],
        ], idempotent: true)->assertStatus(422)->assertJsonPath('error.codigo', 'COBRO_GRUPO_INVALIDO');

        $this->assertSame(0, DB::table('ventas')->count());
    }

    public function test_closing_computes_the_expected_cash_and_records_the_difference(): void
    {
        $session = $this->openCash(100)->json('data.id');
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 5]]); // 30.00
        $this->charge($order, [
            ['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 20, 'monto_recibido' => 50],
            ['metodo_pago_id' => $this->methods['YAPE'], 'monto' => 10],
        ])->assertCreated();

        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/movimientos", ['tipo' => 'INGRESO', 'monto' => 20, 'concepto' => 'Sencillo', 'categoria' => 'INGRESO'])->assertCreated();
        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/movimientos", ['tipo' => 'EGRESO', 'monto' => 5, 'concepto' => 'Compra de gas', 'categoria' => 'SERVICIOS'])
            ->assertCreated()->assertJsonPath('data.categoria', 'SERVICIOS')->assertJsonPath('data.efectivo_esperado', '135.00');
        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/movimientos", ['tipo' => 'EGRESO', 'monto' => 1, 'concepto' => 'No válido', 'categoria' => 'INVENTADA'])
            ->assertUnprocessable();

        $this->as($this->cashier, 'GET', "sesiones-caja/{$session}/resumen")->assertOk()
            ->assertJsonPath('data.resumen.efectivo_esperado', '135.00')
            ->assertJsonPath('data.resumen.ventas.total', '30.00')
            ->assertJsonPath('data.resumen.ticket_promedio', '30.00')
            ->assertJsonPath('data.resumen.ultima_venta.monto', '30.00')
            ->assertJsonCount(2, 'data.resumen.por_metodo')
            ->assertJsonCount(1, 'data.resumen.ventas_por_hora')
            ->assertJsonCount(1, 'data.resumen.ordenes')
            ->assertJsonPath('data.resumen.ordenes.0.numero', 1)
            ->assertJsonPath('data.resumen.ordenes.0.items', 5)
            ->assertJsonPath('data.movimientos.1.categoria', 'SERVICIOS')
            ->assertJsonCount(2, 'data.movimientos');

        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/cierre", ['monto_cierre_declarado' => 130])->assertOk()
            ->assertJsonPath('data.estado', 'CERRADA')
            ->assertJsonPath('data.monto_cierre_calculado', '135.00')
            ->assertJsonPath('data.diferencia', '-5.00');

        $this->as($this->cashier, 'GET', 'sesiones-caja/historial?limite=5')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $session)
            ->assertJsonPath('data.0.resumen.ventas.total', '30.00');

        $this->as($this->cashier, 'POST', "sesiones-caja/{$session}/movimientos", ['tipo' => 'INGRESO', 'monto' => 1, 'concepto' => 'Tarde'])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'SESION_CERRADA');
        $this->as($this->cashier, 'GET', 'sesiones-caja/actual')->assertJsonPath('data', null);
    }

    public function test_nobody_operates_someone_elses_turn_or_another_branch(): void
    {
        $session = $this->openCash(100)->json('data.id');
        $other = $this->user('Cajero', 'caja2@donjose.pe');

        $this->as($other, 'POST', "sesiones-caja/{$session}/cierre", ['monto_cierre_declarado' => 100])->assertForbidden();
        $this->as($other, 'POST', "sesiones-caja/{$session}/movimientos", ['tipo' => 'INGRESO', 'monto' => 1, 'concepto' => 'x'])->assertForbidden();
        $this->as($this->admin, 'POST', "sesiones-caja/{$session}/cierre", ['monto_cierre_declarado' => 100])->assertForbidden();

        $second = $this->asTenant(fn () => DB::table('sucursales')->insertGetId([
            'inquilino_id' => $this->tenant->id,
            'empresa_id' => DB::table('empresas')->value('id'),
            'nombre' => 'Segundo local',
        ]));
        $branchCashier = $this->asTenant(function () use ($second) {
            $user = User::create(['nombre' => 'Cajera B', 'correo' => 'cajab@donjose.pe', 'contrasena' => 'contrasena-segura']);
            DB::table('rol_usuario')->insert([
                'inquilino_id' => $this->tenant->id,
                'usuario_id' => $user->id,
                'rol_id' => DB::table('roles')->where('nombre', 'Cajero')->value('id'),
                'sucursal_id' => $second,
            ]);

            return $user->createToken('web')->plainTextToken;
        });

        // Abre su propia caja, pero no ve ni cobra pedidos de la sucursal A.
        $this->as($branchCashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();
        $order = $this->billedOrder($this->ids['m1'], [['producto_id' => $this->ids['pan'], 'cantidad' => 1]]);
        $this->as($branchCashier, 'GET', 'pedidos/por-cobrar')->assertJsonCount(0, 'data');
        $this->as($branchCashier, 'POST', "pedidos/{$order}/cobro", $this->cash(6), idempotent: true)->assertForbidden();
        $this->as($branchCashier, 'GET', "sesiones-caja/{$session}/resumen")->assertForbidden();
    }

    public function test_cash_changes_are_broadcast_to_the_branch_cash_channel(): void
    {
        Event::fake([CashUpdated::class]);

        $session = $this->openCash(10)->json('data.id');

        Event::assertDispatched(CashUpdated::class, fn (CashUpdated $event) => $event->broadcastOn()->name === "private-sucursal.{$this->ids['sucursal']}.caja"
            && $event->broadcastAs() === 'CajaActualizada'
            && $event->broadcastWith()['sesion_id'] === $session);
    }

    private function openCash(float|int $amount): TestResponse
    {
        return $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => $amount]);
    }

    /** Pedido de la mesa con esos platos, ya con la cuenta pedida. */
    private function billedOrder(int $table, array $items): int
    {
        $order = $this->open($table)->json('data.id');
        $this->send($order, $items)->assertCreated();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();

        return $order;
    }

    /** @param list<array<string, mixed>> $payments */
    private function charge(int $order, array $payments, ?array $itemIds = null): TestResponse
    {
        return $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", ['pagos' => $payments] + ($itemIds ? ['detalle_ids' => $itemIds] : []), idempotent: true);
    }

    private function cash(float|int $amount): array
    {
        return ['pagos' => [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => $amount]]];
    }
}
