<?php

namespace Tests\Feature\Restaurant;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 039: promociones de precio de la carta. */
class PromotionTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cashier;

    /** @var array<string, int> */
    private array $methods = [];

    protected function setUp(): void
    {
        parent::setUp();
        // Congelar antes de crear los tokens: Sanctum expira a las 8 h y el viaje en el tiempo los invalida.
        $this->freezeAt('2026-11-03 12:00:00');
        $this->buildRestaurant();
        $this->cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->methods = DB::table('metodos_pago')->pluck('id', 'codigo')->all();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_active_promotion_changes_the_menu_and_freezes_the_discounted_price(): void
    {
        $this->createPromotion(['producto_ids' => [$this->ids['chicha']], 'valor' => 20]);

        $menu = $this->as($this->waiter, 'GET', 'carta')->assertOk();
        $drink = collect($menu->json('data.productos'))->firstWhere('id', $this->ids['chicha']);

        $this->assertSame('8.00', $drink['precio_promocional']);
        $this->assertSame('2.00', $drink['descuento']);
        $this->assertSame('Happy hour', $drink['promocion']['nombre']);

        $order = $this->open($this->ids['m1'])->json('data.id');
        $this->send($order, [['producto_id' => $this->ids['chicha'], 'cantidad' => 2]])->assertCreated();

        $detail = $this->as($this->waiter, 'GET', "pedidos/{$order}")->assertOk()->json('data.detalles.0');
        $this->assertSame('8.00', $detail['precio_unitario']);
        $this->assertSame('4.00', $detail['descuento']);
        $this->assertSame('Happy hour', $detail['promocion']);

        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();
        $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();
        $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", [
            'pagos' => [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => 16]],
        ], idempotent: true)->assertCreated()->assertJsonPath('data.venta.total', '16.00');

        $saleLine = $this->asTenant(fn () => DB::table('detalle_ventas')->orderByDesc('id')->first(['total', 'descuento']));
        $this->assertSame('16.00', $saleLine->total);
        $this->assertSame('4.00', $saleLine->descuento);
    }

    public function test_promotion_outside_its_time_window_does_not_apply(): void
    {
        $this->createPromotion([
            'producto_ids' => [$this->ids['chicha']],
            'hora_inicio' => '18:00',
            'hora_fin' => '21:00',
        ]);

        $drink = collect($this->as($this->waiter, 'GET', 'carta')->json('data.productos'))->firstWhere('id', $this->ids['chicha']);
        $this->assertNull($drink['precio_promocional']);

        $this->as($this->admin, 'GET', 'promociones')
            ->assertOk()
            ->assertJsonPath('data.0.estado', 'FUERA_DE_VENTANA')
            ->assertJsonPath('data.0.aplica_ahora', false);
    }

    public function test_a_direct_product_promotion_wins_over_its_category(): void
    {
        $categoryId = $this->asTenant(fn () => (int) DB::table('productos')->where('id', $this->ids['lomo'])->value('categoria_id'));

        $this->createPromotion([
            'nombre' => 'Fondos -10%',
            'valor' => 10,
            'producto_ids' => [],
            'categoria_ids' => [$categoryId],
            'prioridad' => 1,
        ]);
        $this->createPromotion([
            'nombre' => 'Lomo -25%',
            'valor' => 25,
            'producto_ids' => [$this->ids['lomo']],
            'categoria_ids' => [],
            'prioridad' => 0,
        ]);

        $dish = collect($this->as($this->waiter, 'GET', 'carta')->json('data.productos'))->firstWhere('id', $this->ids['lomo']);
        $this->assertSame('31.50', $dish['precio_promocional']);
        $this->assertSame('Lomo -25%', $dish['promocion']['nombre']);
    }

    public function test_promotions_are_validated_and_respect_permissions_and_tenants(): void
    {
        $this->as($this->admin, 'POST', 'promociones', [
            'nombre' => 'Imposible', 'tipo' => 'PORCENTAJE', 'valor' => 120,
            'desde' => '2026-11-03 08:00', 'hasta' => '2026-11-03 22:00',
            'producto_ids' => [$this->ids['chicha']],
        ])->assertStatus(422)->assertJsonStructure(['error' => ['detalles' => ['valor']]]);

        $this->as($this->admin, 'POST', 'promociones', [
            'nombre' => 'Sin alcance', 'tipo' => 'PRECIO_FIJO', 'valor' => 5,
            'desde' => '2026-11-03 08:00', 'hasta' => '2026-11-03 22:00',
        ])->assertStatus(422);

        $this->as($this->waiter, 'POST', 'promociones', [
            'nombre' => 'Mozo', 'tipo' => 'PRECIO_FIJO', 'valor' => 5,
            'desde' => '2026-11-03 08:00', 'hasta' => '2026-11-03 22:00',
            'producto_ids' => [$this->ids['chicha']],
        ])->assertForbidden();

        $this->createPromotion();
        $this->as($this->admin, 'GET', 'promociones')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.estado', 'VIGENTE')
            ->assertJsonPath('data.0.productos.0.nombre', 'Chicha morada');

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->getJson($this->tenantUrl('otro', 'promociones'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /** @param array<string, mixed> $overrides */
    private function createPromotion(array $overrides = []): int
    {
        $body = array_merge([
            'nombre' => 'Happy hour',
            'descripcion' => 'Promo de prueba',
            'tipo' => 'PORCENTAJE',
            'valor' => 20,
            'desde' => '2026-11-03 08:00',
            'hasta' => '2026-11-03 22:00',
            'dias_semana' => [1, 2, 3, 4, 5, 6, 7],
            'prioridad' => 0,
            'es_activa' => true,
            'producto_ids' => [$this->ids['chicha']],
            'categoria_ids' => [],
        ], $overrides);

        return $this->as($this->admin, 'POST', 'promociones', $body)->assertCreated()->json('data.id');
    }

    private function freezeAt(string $lima): void
    {
        $moment = CarbonImmutable::parse($lima, 'America/Lima')->utc();
        Carbon::setTestNow($moment);
        CarbonImmutable::setTestNow($moment);
    }

    private function send(int $order, array $items): TestResponse
    {
        return $this->as($this->waiter, 'POST', "pedidos/{$order}/comandas", ['items' => $items], idempotent: true);
    }
}
