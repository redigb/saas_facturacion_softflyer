<?php

namespace Database\Seeders;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\InventoryMovement;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Application\ManageRestaurantInventory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Datos ficticios, repetibles y exclusivos del restaurante local Don José. */
class InventarioDonJoseSeeder extends Seeder
{
    private const PREFIX = '[DEMO INVENTARIO] ';

    public function run(TenantContext $context, ManageRestaurantInventory $inventory): void
    {
        if (! app()->isLocal()) {
            throw new RuntimeException('Este seeder solo puede ejecutarse en el entorno local.');
        }

        $tenant = Tenant::where('slug', 'donjose')->firstOrFail();
        $context->set($tenant);

        try {
            $admin = User::where('correo', 'admin@donjose.pe')->firstOrFail();
            $branch = Branch::where('es_principal', true)->firstOrFail();
            $warehouses = collect($inventory->catalogs($admin, $branch->id)['almacenes']);
            $general = (int) $warehouses->firstWhere('estacion_id', null)['id'];
            $kitchen = (int) ($warehouses->first(fn (array $item) => str_contains(mb_strtolower($item['nombre']), 'cocina'))['id'] ?? 0);
            $bar = (int) ($warehouses->first(fn (array $item) => str_contains(mb_strtolower($item['nombre']), 'barra') || str_contains(mb_strtolower($item['nombre']), 'bar'))['id'] ?? 0);

            if (! $kitchen || ! $bar) {
                throw new RuntimeException('Don José necesita estaciones activas de Cocina y Barra.');
            }

            $this->consumable($inventory, $admin, $general, 'INV-DEMO-001', 'Detergente lavavajillas', 'LIMPIEZA', 'LTR', 5, [
                ['ENTRADA', 12, 'Compra inicial de limpieza'],
                ['SALIDA', 2, 'Consumo de la semana'],
            ]);
            $this->consumable($inventory, $admin, $general, 'INV-DEMO-002', 'Envases para delivery', 'EMPAQUE', 'NIU', 50, [
                ['ENTRADA', 40, 'Recepción de empaques'],
            ]);

            $this->consumable($inventory, $admin, $kitchen, 'INV-DEMO-101', 'Papa amarilla', 'ALIMENTO', 'KGM', 8, [
                ['ENTRADA', 25, 'Compra del mercado'],
                ['SALIDA', 6.5, 'Producción del turno'],
                ['MERMA', 1.2, 'Producto deteriorado'],
            ]);
            $this->consumable($inventory, $admin, $kitchen, 'INV-DEMO-102', 'Lomo de res', 'ALIMENTO', 'KGM', 10, [
                ['ENTRADA', 8, 'Recepción del proveedor'],
                ['SALIDA', 2.25, 'Preparación de platos'],
            ]);
            $this->consumable($inventory, $admin, $kitchen, 'INV-DEMO-103', 'Aceite vegetal', 'ALIMENTO', 'LTR', 5, [
                ['ENTRADA', 18, 'Compra semanal'],
                ['SALIDA', 4, 'Consumo de cocina'],
            ]);
            $this->reusable($inventory, $admin, $kitchen, 'INV-DEMO-104', 'Wok grande', 'UTENSILIO', 4, 3, 1, 1);

            $this->consumable($inventory, $admin, $bar, 'INV-DEMO-201', 'Limón fresco', 'ALIMENTO', 'KGM', 5, [
                ['ENTRADA', 4.5, 'Compra para barra'],
                ['SALIDA', 1, 'Preparación de bebidas'],
            ]);
            $this->consumable($inventory, $admin, $bar, 'INV-DEMO-202', 'Agua mineral 500 ml', 'BEBIDA', 'NIU', 24, [
                ['ENTRADA', 60, 'Recepción de bebidas'],
                ['SALIDA', 18, 'Ventas del turno'],
            ]);
            $this->consumable($inventory, $admin, $bar, 'INV-DEMO-203', 'Pisco quebranta', 'BEBIDA', 'LTR', 4, [
                ['ENTRADA', 8, 'Compra para coctelería'],
                ['SALIDA', 2.5, 'Consumo de barra'],
            ]);
            $this->reusable($inventory, $admin, $bar, 'INV-DEMO-204', 'Copa highball', 'UTENSILIO', 24, 28, 3, 1);

            $this->command?->info('Inventario ficticio de Don José listo: General, Cocina y Barra.');
        } finally {
            $context->clear();
        }
    }

    /** @param list<array{0: string, 1: float|int, 2: string}> $movements */
    private function consumable(ManageRestaurantInventory $inventory, User $admin, int $warehouseId, string $code, string $name, string $category, string $unit, float $minimum, array $movements): void
    {
        $product = $this->item($inventory, $admin, $warehouseId, $code, $name, $category, 'CONSUMIBLE', $unit, $minimum);
        if ($this->wasSeeded($warehouseId, $product->id)) {
            return;
        }

        foreach ($movements as [$type, $quantity, $reason]) {
            $inventory->movement($admin, [
                'almacen_id' => $warehouseId,
                'producto_id' => $product->id,
                'tipo' => $type,
                'cantidad' => $quantity,
                'motivo' => self::PREFIX.$reason,
            ]);
        }
    }

    private function reusable(ManageRestaurantInventory $inventory, User $admin, int $warehouseId, string $code, string $name, string $category, float $minimum, float $available, float $damaged, float $lost): void
    {
        $product = $this->item($inventory, $admin, $warehouseId, $code, $name, $category, 'REUTILIZABLE', 'NIU', $minimum);
        if ($this->wasSeeded($warehouseId, $product->id)) {
            return;
        }

        $inventory->count($admin, [
            'almacen_id' => $warehouseId,
            'producto_id' => $product->id,
            'cantidad_disponible' => $available,
            'cantidad_danada' => $damaged,
            'cantidad_perdida' => $lost,
            'motivo' => self::PREFIX.'Conteo físico del cierre',
        ]);
    }

    private function item(ManageRestaurantInventory $inventory, User $admin, int $warehouseId, string $code, string $name, string $category, string $nature, string $unit, float $minimum): Product
    {
        $product = Product::where('codigo', $code)->first();
        $inventory->saveItem($admin, $product, [
            'almacen_id' => $warehouseId,
            'codigo' => $code,
            'nombre' => $name,
            'descripcion' => 'Dato ficticio para probar el flujo de inventario.',
            'unidad_medida_id' => DB::table('unidades_medida')->where('codigo', $unit)->value('id'),
            'categoria_inventario' => $category,
            'naturaleza_inventario' => $nature,
            'stock_minimo' => $minimum,
            'es_activo' => true,
        ]);

        return Product::where('codigo', $code)->firstOrFail();
    }

    private function wasSeeded(int $warehouseId, int $productId): bool
    {
        return InventoryMovement::where('almacen_id', $warehouseId)
            ->where('producto_id', $productId)
            ->where('motivo', 'like', self::PREFIX.'%')
            ->exists();
    }
}
