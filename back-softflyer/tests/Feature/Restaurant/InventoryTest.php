<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 014: inventario integral y alcance por estación. */
class InventoryTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cook;

    private string $bar;

    private int $kitchenWarehouse;

    private int $barWarehouse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->cook = $this->user('Cocinero', 'cocina@donjose.pe');
        $this->bar = $this->user('Cocinero', 'barra@donjose.pe');

        $cookId = $this->asTenant(fn () => (int) User::where('correo', 'cocina@donjose.pe')->value('id'));
        $barId = $this->asTenant(fn () => (int) User::where('correo', 'barra@donjose.pe')->value('id'));
        $this->as($this->admin, 'PUT', "cocina/accesos/{$cookId}", ['estacion_ids' => [$this->ids['cocina']], 'general' => false])->assertOk();
        $this->as($this->admin, 'PUT', "cocina/accesos/{$barId}", ['estacion_ids' => [$this->ids['bar']], 'general' => false])->assertOk();

        $warehouses = collect($this->as($this->admin, 'GET', "inventario/catalogos?sucursal_id={$this->ids['sucursal']}")->json('data.almacenes'));
        $this->kitchenWarehouse = (int) $warehouses->firstWhere('estacion_id', $this->ids['cocina'])['id'];
        $this->barWarehouse = (int) $warehouses->firstWhere('estacion_id', $this->ids['bar'])['id'];
    }

    public function test_admin_creates_item_and_every_movement_is_auditable(): void
    {
        $unit = $this->asTenant(fn () => (int) DB::table('unidades_medida')->where('codigo', 'KGM')->value('id'));
        $product = $this->as($this->admin, 'POST', 'inventario/articulos', [
            'almacen_id' => $this->kitchenWarehouse,
            'nombre' => 'Papa amarilla',
            'unidad_medida_id' => $unit,
            'categoria_inventario' => 'ALIMENTO',
            'naturaleza_inventario' => 'CONSUMIBLE',
            'stock_minimo' => 5,
        ])->assertCreated()->json('data.producto.id');

        $this->as($this->admin, 'POST', 'inventario/movimientos', [
            'almacen_id' => $this->kitchenWarehouse,
            'producto_id' => $product,
            'tipo' => 'ENTRADA',
            'cantidad' => 12.5,
            'motivo' => 'Compra del mercado',
        ], true)->assertCreated()->assertJsonPath('data.existencia.cantidad', 12.5);

        $this->as($this->cook, 'POST', 'inventario/movimientos', [
            'almacen_id' => $this->kitchenWarehouse,
            'producto_id' => $product,
            'tipo' => 'MERMA',
            'cantidad' => 1.5,
            'motivo' => 'Producto deteriorado',
        ], true)->assertCreated()->assertJsonPath('data.existencia.cantidad', 11);

        $this->as($this->admin, 'GET', "inventario/kardex?almacen_id={$this->kitchenWarehouse}&producto_id={$product}")
            ->assertOk()
            ->assertJsonCount(2, 'data.movimientos')
            ->assertJsonPath('data.movimientos.0.tipo', 'MERMA')
            ->assertJsonPath('data.movimientos.0.usuario.nombre', 'Cocinero')
            ->assertJsonPath('data.movimientos.1.saldo_resultante', 12.5);
    }

    public function test_kitchen_and_bar_only_see_their_assigned_warehouse(): void
    {
        $unit = $this->asTenant(fn () => (int) DB::table('unidades_medida')->where('codigo', 'KGM')->value('id'));
        $kitchenProduct = $this->as($this->admin, 'POST', 'inventario/articulos', [
            'almacen_id' => $this->kitchenWarehouse,
            'nombre' => 'Cebolla roja',
            'unidad_medida_id' => $unit,
            'categoria_inventario' => 'ALIMENTO',
            'naturaleza_inventario' => 'CONSUMIBLE',
            'stock_minimo' => 2,
        ])->assertCreated()->json('data.producto.id');

        $this->as($this->cook, 'GET', "inventario?sucursal_id={$this->ids['sucursal']}")
            ->assertOk()
            ->assertJsonCount(1, 'data.almacenes')
            ->assertJsonPath('data.almacenes.0.estacion_id', $this->ids['cocina'])
            ->assertJsonCount(1, 'data.existencias');

        $this->as($this->bar, 'GET', "inventario?sucursal_id={$this->ids['sucursal']}")
            ->assertOk()
            ->assertJsonCount(1, 'data.almacenes')
            ->assertJsonPath('data.almacenes.0.estacion_id', $this->ids['bar'])
            ->assertJsonCount(0, 'data.existencias');

        $this->as($this->bar, 'POST', 'inventario/movimientos', [
            'almacen_id' => $this->barWarehouse,
            'producto_id' => $kitchenProduct,
            'tipo' => 'ENTRADA',
            'cantidad' => 1,
            'motivo' => 'No debe poder cruzar almacenes',
        ], true)->assertNotFound();

        $this->as($this->cook, 'GET', "inventario?almacen_id={$this->barWarehouse}")->assertForbidden();
        $this->as($this->bar, 'GET', "inventario?almacen_id={$this->kitchenWarehouse}")->assertForbidden();
        $this->as($this->waiter, 'GET', 'inventario')->assertForbidden();
    }

    public function test_reusable_objects_keep_physical_condition_counts(): void
    {
        $unit = $this->asTenant(fn () => (int) DB::table('unidades_medida')->where('codigo', 'NIU')->value('id'));
        $product = $this->as($this->admin, 'POST', 'inventario/articulos', [
            'almacen_id' => $this->barWarehouse,
            'nombre' => 'Copa de vino',
            'unidad_medida_id' => $unit,
            'categoria_inventario' => 'UTENSILIO',
            'naturaleza_inventario' => 'REUTILIZABLE',
            'stock_minimo' => 20,
        ])->assertCreated()->json('data.producto.id');

        $this->as($this->bar, 'POST', 'inventario/conteos', [
            'almacen_id' => $this->barWarehouse,
            'producto_id' => $product,
            'cantidad_disponible' => 38,
            'cantidad_danada' => 2,
            'cantidad_perdida' => 1,
            'motivo' => 'Conteo de cierre',
        ], true)->assertCreated()
            ->assertJsonPath('data.existencia.cantidad', 40)
            ->assertJsonPath('data.existencia.estado.disponible', 38)
            ->assertJsonPath('data.existencia.estado.danada', 2)
            ->assertJsonPath('data.existencia.estado.perdida', 1);
    }

    public function test_stock_cannot_be_negative_and_items_do_not_cross_tenants(): void
    {
        $unit = $this->asTenant(fn () => (int) DB::table('unidades_medida')->where('codigo', 'LTR')->value('id'));
        $product = $this->as($this->admin, 'POST', 'inventario/articulos', [
            'almacen_id' => $this->barWarehouse,
            'nombre' => 'Jarabe de goma',
            'unidad_medida_id' => $unit,
            'categoria_inventario' => 'BEBIDA',
            'naturaleza_inventario' => 'CONSUMIBLE',
            'stock_minimo' => 2,
        ])->assertCreated()->json('data.producto.id');

        $this->as($this->bar, 'POST', 'inventario/movimientos', [
            'almacen_id' => $this->barWarehouse,
            'producto_id' => $product,
            'tipo' => 'SALIDA',
            'cantidad' => 1,
            'motivo' => 'Preparación de bebidas',
        ], true)->assertStatus(422)->assertJsonPath('error.codigo', 'STOCK_INSUFICIENTE');

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->getJson($this->tenantUrl('otro', "inventario/kardex?almacen_id={$this->barWarehouse}&producto_id={$product}"))
            ->assertNotFound();
    }
}
