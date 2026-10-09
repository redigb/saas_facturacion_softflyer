<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Lo que el modulo agrega a categorias y productos del Core: estacion de preparacion y
 * grupos de modificadores. Vive en tablas del modulo para que el Core no lo conozca (Doc. 08 §15).
 */
final class MenuAssignments
{
    public function __construct(private readonly TenantContext $context) {}

    /** @return array<int, int> categoria_id => estacion_preparacion_id */
    public function categoryStations(?array $categoryIds = null): array
    {
        return $this->stations('categoria_estacion', 'categoria_id', $categoryIds);
    }

    /** @return array<int, int> producto_id => estacion_preparacion_id */
    public function productStations(?array $productIds = null): array
    {
        return $this->stations('producto_estacion', 'producto_id', $productIds);
    }

    /** @return array<int, list<int>> producto_id => grupos en orden */
    public function productGroups(?array $productIds = null): array
    {
        $rows = DB::table('producto_modificador_grupo')
            ->when($productIds !== null, fn ($query) => $query->whereIn('producto_id', $productIds))
            ->orderBy('orden')
            ->get(['producto_id', 'modificador_grupo_id']);

        $groups = [];
        foreach ($rows as $row) {
            $groups[$row->producto_id][] = (int) $row->modificador_grupo_id;
        }

        return $groups;
    }

    public function setCategoryStation(int $categoryId, ?int $stationId): void
    {
        $this->setStation('categoria_estacion', 'categoria_id', $categoryId, $stationId);
    }

    public function setProductStation(int $productId, ?int $stationId): void
    {
        $this->setStation('producto_estacion', 'producto_id', $productId, $stationId);
    }

    /** @param list<int> $groupIds en el orden en que el mozo los vera */
    public function setProductGroups(int $productId, array $groupIds): void
    {
        DB::table('producto_modificador_grupo')->where('producto_id', $productId)->delete();

        DB::table('producto_modificador_grupo')->insert(array_map(fn (int $groupId, int $order) => [
            'inquilino_id' => $this->context->id(),
            'producto_id' => $productId,
            'modificador_grupo_id' => $groupId,
            'orden' => $order,
        ], array_values($groupIds), array_keys(array_values($groupIds))));
    }

    public function groupIsInUse(int $groupId): bool
    {
        return DB::table('producto_modificador_grupo')->where('modificador_grupo_id', $groupId)->exists();
    }

    private function stations(string $table, string $column, ?array $ids): array
    {
        return DB::table($table)
            ->when($ids !== null, fn ($query) => $query->whereIn($column, $ids))
            ->pluck('estacion_preparacion_id', $column)
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function setStation(string $table, string $column, int $id, ?int $stationId): void
    {
        if ($stationId === null) {
            DB::table($table)->where($column, $id)->delete();

            return;
        }

        DB::table($table)->updateOrInsert(
            [$column => $id],
            ['inquilino_id' => $this->context->id(), 'estacion_preparacion_id' => $stationId],
        );
    }
}
