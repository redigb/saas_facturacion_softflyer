<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Billing\Infrastructure\Persistence\IgvAffectationType;
use App\Core\Billing\Infrastructure\Persistence\UnitOfMeasure;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\InventoryMovement;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Inventory\Infrastructure\Persistence\Stock;
use App\Core\Inventory\Infrastructure\Persistence\Warehouse;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Inventario operativo del restaurante, limitado por sucursal y estación KDS. */
final class ManageRestaurantInventory
{
    private const ADMIN = 'inventario.administrar';

    /** @return array<string, mixed> */
    public function dashboard(User $user, int $branchId, ?int $warehouseId): array
    {
        $branch = $this->branch($user, $branchId);
        $warehouses = $this->authorizedWarehouses($user, $branch);
        $warehouse = $warehouseId
            ? $warehouses->firstWhere('id', $warehouseId)
            : $warehouses->first();

        if ($warehouseId && ! $warehouse) {
            throw new AccessDeniedHttpException;
        }

        $items = $warehouse ? $this->stockItems($warehouse) : [];

        return [
            'sucursal' => ['id' => $branch->id, 'nombre' => $branch->nombre],
            'almacenes' => $warehouses->map(fn (Warehouse $item) => $this->warehouseData($item))->values()->all(),
            'almacen_actual_id' => $warehouse?->id,
            'resumen' => [
                'articulos' => count($items),
                'stock_bajo' => count(array_filter($items, fn (array $item) => $item['stock_bajo'])),
                'almacenes' => $warehouses->count(),
            ],
            'existencias' => $items,
        ];
    }

    /** @return array<string, mixed> */
    public function catalogs(User $user, int $branchId): array
    {
        $branch = $this->branch($user, $branchId);

        return [
            'unidades' => UnitOfMeasure::query()->where('es_activo', true)->orderBy('nombre')->get(['id', 'codigo', 'nombre'])->all(),
            'almacenes' => $this->authorizedWarehouses($user, $branch)->map(fn (Warehouse $item) => $this->warehouseData($item))->values()->all(),
            'categorias' => ['ALIMENTO', 'BEBIDA', 'LIMPIEZA', 'EMPAQUE', 'UTENSILIO', 'EQUIPO', 'OTRO'],
            'naturalezas' => ['CONSUMIBLE', 'REUTILIZABLE'],
        ];
    }

    /** @param array<string, mixed> $data */
    public function saveItem(User $user, ?Product $product, array $data): array
    {
        $this->authorizeAdmin($user);
        $warehouse = $this->warehouse($user, (int) $data['almacen_id'], true);

        return DB::transaction(function () use ($product, $data, $warehouse) {
            $item = $product ?? new Product;
            if ($item->exists && ! $item->controla_stock) {
                throw new BusinessException('ARTICULO_NO_INVENTARIABLE', 'El producto no pertenece al inventario.', 422);
            }

            if (! $item->exists) {
                $item->fill([
                    'codigo' => $data['codigo'] ?? $this->nextCode(),
                    'tipo_afectacion_igv_id' => IgvAffectationType::where('codigo', '10')->value('id'),
                    'es_vendible' => false,
                    'precio_venta' => null,
                    'controla_stock' => true,
                    'es_activo' => true,
                ]);
            }

            $nature = $data['naturaleza_inventario'];
            $item->fill([
                'nombre' => $data['nombre'],
                'codigo' => $data['codigo'] ?? $item->codigo,
                'descripcion' => $data['descripcion'] ?? null,
                'unidad_medida_id' => $data['unidad_medida_id'],
                'categoria_inventario' => $data['categoria_inventario'],
                'naturaleza_inventario' => $nature,
                'tipo' => $nature === 'REUTILIZABLE' ? 'OBJETO' : ($data['categoria_inventario'] === 'BEBIDA' ? 'BEBIDA' : 'INSUMO'),
                'controla_stock' => true,
                'es_activo' => $data['es_activo'] ?? true,
            ])->save();

            $stock = Stock::firstOrCreate(
                ['almacen_id' => $warehouse->id, 'producto_id' => $item->id],
                ['stock_minimo' => $data['stock_minimo'] ?? 0],
            );
            $stock->stock_minimo = $data['stock_minimo'] ?? $stock->stock_minimo;
            $stock->save();

            return $this->itemData($item->load('unit'), $stock);
        });
    }

    /** @param array<string, mixed> $data */
    public function movement(User $user, array $data): array
    {
        $warehouse = $this->warehouse($user, (int) $data['almacen_id']);
        $product = Product::query()->whereKey($data['producto_id'])->where('controla_stock', true)->where('es_activo', true)->firstOrFail();
        $type = $data['tipo'];
        $direction = $type === 'ENTRADA' ? 'ENTRADA' : 'SALIDA';

        return DB::transaction(function () use ($user, $warehouse, $product, $type, $direction, $data) {
            $stock = $this->lockedStock($warehouse, $product);
            $quantity = $this->number($data['cantidad']);
            $before = $this->number($stock->cantidad);
            $after = round($before + ($direction === 'ENTRADA' ? $quantity : -$quantity), 4);
            if ($after < 0) {
                throw new BusinessException('STOCK_INSUFICIENTE', 'No hay stock suficiente para registrar esta salida.', 422, [
                    'cantidad' => ['Disponible: '.$this->format($before).' '.$product->unit?->codigo],
                ]);
            }

            $previousState = $this->state($stock);
            $stock->cantidad = $after;
            if ($product->naturaleza_inventario === 'REUTILIZABLE') {
                $available = $this->number($stock->cantidad_disponible) + ($direction === 'ENTRADA' ? $quantity : -$quantity);
                if ($available < 0) {
                    throw new BusinessException('STOCK_INSUFICIENTE', 'No hay objetos disponibles suficientes para registrar esta salida.', 422);
                }
                $stock->cantidad_disponible = $available;
            }
            $stock->save();

            $movement = $this->record($user, $warehouse, $product, $type, $direction, $quantity, $before, $after, $data['motivo'], $previousState, $this->state($stock));

            return ['existencia' => $this->itemData($product->load('unit'), $stock), 'movimiento' => $this->movementData($movement->load('user'))];
        });
    }

    /** @param array<string, mixed> $data */
    public function count(User $user, array $data): array
    {
        $warehouse = $this->warehouse($user, (int) $data['almacen_id']);
        $product = Product::query()->whereKey($data['producto_id'])->where('controla_stock', true)->where('es_activo', true)->firstOrFail();

        return DB::transaction(function () use ($user, $warehouse, $product, $data) {
            $stock = $this->lockedStock($warehouse, $product);
            $before = $this->number($stock->cantidad);
            $previousState = $this->state($stock);

            if ($product->naturaleza_inventario === 'REUTILIZABLE') {
                $available = $this->number($data['cantidad_disponible']);
                $damaged = $this->number($data['cantidad_danada']);
                $lost = $this->number($data['cantidad_perdida']);
                $after = round($available + $damaged, 4);
                $stock->cantidad_disponible = $available;
                $stock->cantidad_danada = $damaged;
                $stock->cantidad_perdida = $lost;
            } else {
                $after = $this->number($data['cantidad_contada']);
            }

            $stock->cantidad = $after;
            $stock->save();
            $delta = round($after - $before, 4);
            $movement = $this->record(
                $user,
                $warehouse,
                $product,
                'AJUSTE',
                $delta >= 0 ? 'ENTRADA' : 'SALIDA',
                abs($delta),
                $before,
                $after,
                $data['motivo'],
                $previousState,
                $this->state($stock),
            );

            return ['existencia' => $this->itemData($product->load('unit'), $stock), 'movimiento' => $this->movementData($movement->load('user'))];
        });
    }

    /** @return array<string, mixed> */
    public function ledger(User $user, int $warehouseId, ?int $productId, ?int $cursor): array
    {
        $warehouse = $this->warehouse($user, $warehouseId);
        $query = InventoryMovement::query()
            ->with('user:id,nombre')
            ->where('almacen_id', $warehouse->id)
            ->when($productId, fn ($builder) => $builder->where('producto_id', $productId))
            ->when($cursor, fn ($builder) => $builder->where('id', '<', $cursor))
            ->orderByDesc('id')
            ->limit(31);
        $rows = $query->get();
        $hasMore = $rows->count() > 30;
        $rows = $rows->take(30);

        return [
            'movimientos' => $rows->map(fn (InventoryMovement $movement) => $this->movementData($movement))->values()->all(),
            'siguiente_cursor' => $hasMore ? $rows->last()?->id : null,
        ];
    }

    private function branch(User $user, int $branchId): Branch
    {
        if (! $user->worksAt($branchId)) {
            throw new AccessDeniedHttpException;
        }

        return Branch::query()->whereKey($branchId)->where('es_activa', true)->firstOrFail();
    }

    /** @return Collection<int, Warehouse> */
    private function authorizedWarehouses(User $user, Branch $branch): Collection
    {
        $this->ensureWarehouses($branch);
        $query = Warehouse::query()->where('sucursal_id', $branch->id)->where('es_activo', true)->orderByDesc('es_principal')->orderBy('nombre');

        if (! $user->hasPermission(self::ADMIN)) {
            $assigned = DB::table('usuario_estacion_preparacion')->where('usuario_id', $user->id)->pluck('estacion_preparacion_id');
            $stationIds = $assigned->filter()->map(fn ($id) => (int) $id)->all();
            $seesGeneral = $assigned->contains(null);
            $query->where(function ($scope) use ($stationIds, $seesGeneral) {
                if ($stationIds !== []) {
                    $scope->whereIn('estacion_preparacion_id', $stationIds);
                }
                if ($seesGeneral) {
                    $stationIds !== [] ? $scope->orWhereNull('estacion_preparacion_id') : $scope->whereNull('estacion_preparacion_id');
                }
                if ($stationIds === [] && ! $seesGeneral) {
                    $scope->whereRaw('1 = 0');
                }
            });
        }

        return $query->get();
    }

    private function warehouse(User $user, int $warehouseId, bool $adminOnly = false): Warehouse
    {
        if ($adminOnly) {
            $this->authorizeAdmin($user);
        }
        $warehouse = Warehouse::query()->whereKey($warehouseId)->where('es_activo', true)->firstOrFail();
        $branch = $this->branch($user, $warehouse->sucursal_id);
        if (! $this->authorizedWarehouses($user, $branch)->contains('id', $warehouse->id)) {
            throw new AccessDeniedHttpException;
        }

        return $warehouse;
    }

    private function ensureWarehouses(Branch $branch): void
    {
        Warehouse::updateOrCreate(
            ['sucursal_id' => $branch->id, 'estacion_preparacion_id' => null],
            ['nombre' => 'Almacén general', 'es_principal' => true, 'es_activo' => true],
        );
        $stations = PreparationStation::query()->where('es_activa', true)->orderBy('id')->get(['id', 'nombre']);
        Warehouse::query()->where('sucursal_id', $branch->id)->whereNotNull('estacion_preparacion_id')
            ->whereNotIn('estacion_preparacion_id', $stations->modelKeys())->update(['es_activo' => false, 'actualizado_en' => now()]);
        $stations->each(function (PreparationStation $station) use ($branch) {
            Warehouse::updateOrCreate(
                ['sucursal_id' => $branch->id, 'estacion_preparacion_id' => $station->id],
                ['nombre' => $station->nombre, 'es_principal' => false, 'es_activo' => true],
            );
        });
    }

    private function authorizeAdmin(User $user): void
    {
        if (! $user->hasPermission(self::ADMIN)) {
            throw new AccessDeniedHttpException;
        }
    }

    /** @return list<array<string, mixed>> */
    private function stockItems(Warehouse $warehouse): array
    {
        return Stock::query()
            ->with(['product' => fn ($query) => $query->with('unit:id,codigo,nombre')])
            ->where('almacen_id', $warehouse->id)
            ->whereHas('product', fn ($query) => $query->where('controla_stock', true)->where('es_activo', true))
            ->get()
            ->sortBy(fn (Stock $stock) => $stock->product->nombre)
            ->map(fn (Stock $stock) => $this->itemData($stock->product, $stock))
            ->values()
            ->all();
    }

    private function lockedStock(Warehouse $warehouse, Product $product): Stock
    {
        return Stock::query()->where('almacen_id', $warehouse->id)->where('producto_id', $product->id)->lockForUpdate()->firstOrFail();
    }

    private function record(User $user, Warehouse $warehouse, Product $product, string $type, string $direction, float $quantity, float $before, float $after, string $reason, array $previousState, array $resultingState): InventoryMovement
    {
        return InventoryMovement::create([
            'almacen_id' => $warehouse->id,
            'producto_id' => $product->id,
            'tipo' => $type,
            'sentido' => $direction,
            'cantidad' => $quantity,
            'saldo_anterior' => $before,
            'saldo_resultante' => $after,
            'motivo' => $reason,
            'estado_anterior' => $previousState,
            'estado_resultante' => $resultingState,
            'usuario_id' => $user->id,
            'creado_en' => now(),
        ]);
    }

    /** @return array<string, float> */
    private function state(Stock $stock): array
    {
        return [
            'disponible' => $this->number($stock->cantidad_disponible),
            'danada' => $this->number($stock->cantidad_danada),
            'perdida' => $this->number($stock->cantidad_perdida),
        ];
    }

    /** @return array<string, mixed> */
    private function itemData(Product $product, ?Stock $stock): array
    {
        $quantity = $this->number($stock?->cantidad ?? 0);
        $minimum = $this->number($stock?->stock_minimo ?? 0);

        return [
            'producto' => [
                'id' => $product->id,
                'codigo' => $product->codigo,
                'nombre' => $product->nombre,
                'descripcion' => $product->descripcion,
                'categoria' => $product->categoria_inventario,
                'naturaleza' => $product->naturaleza_inventario,
                'unidad' => $product->unit?->only(['id', 'codigo', 'nombre']),
                'es_activo' => $product->es_activo,
            ],
            'cantidad' => $quantity,
            'stock_minimo' => $minimum,
            'stock_bajo' => $minimum > 0 && $quantity <= $minimum,
            'estado' => [
                'disponible' => $this->number($stock?->cantidad_disponible ?? 0),
                'danada' => $this->number($stock?->cantidad_danada ?? 0),
                'perdida' => $this->number($stock?->cantidad_perdida ?? 0),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function warehouseData(Warehouse $warehouse): array
    {
        return [
            'id' => $warehouse->id,
            'nombre' => $warehouse->nombre,
            'sucursal_id' => $warehouse->sucursal_id,
            'estacion_id' => $warehouse->estacion_preparacion_id,
            'es_principal' => $warehouse->es_principal,
        ];
    }

    /** @return array<string, mixed> */
    private function movementData(InventoryMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'producto_id' => $movement->producto_id,
            'tipo' => $movement->tipo,
            'sentido' => $movement->sentido,
            'cantidad' => $this->number($movement->cantidad),
            'saldo_anterior' => $this->number($movement->saldo_anterior),
            'saldo_resultante' => $this->number($movement->saldo_resultante),
            'motivo' => $movement->motivo,
            'estado_anterior' => $movement->estado_anterior,
            'estado_resultante' => $movement->estado_resultante,
            'usuario' => $movement->user?->only(['id', 'nombre']),
            'creado_en' => $movement->creado_en?->toIso8601String(),
        ];
    }

    private function nextCode(): string
    {
        do {
            $code = 'INV-'.Str::upper(Str::random(6));
        } while (Product::withTrashed()->where('codigo', $code)->exists());

        return $code;
    }

    private function number(mixed $value): float
    {
        return round((float) $value, 4);
    }

    private function format(float $value): string
    {
        return rtrim(rtrim(number_format($value, 4, '.', ''), '0'), '.');
    }
}
