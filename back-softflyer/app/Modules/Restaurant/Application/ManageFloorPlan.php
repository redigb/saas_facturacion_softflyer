<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningRoom;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningTable;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Salones y su plano (spec 003, Doc. 08 §7). El editor trabaja en local y guarda el plano
 * completo de una vez; `salones.version` evita que un guardado pise a otro.
 */
final class ManageFloorPlan
{
    private const GEOMETRY = ['pos_x', 'pos_y', 'ancho', 'alto', 'rotacion'];

    public function createRoom(array $data): DiningRoom
    {
        $branchId = $data['sucursal_id'] ?? Branch::where('es_principal', true)->value('id');

        return DiningRoom::create([
            'sucursal_id' => $branchId,
            'nombre' => $data['nombre'],
            'ancho' => $data['ancho'] ?? 1000,
            'alto' => $data['alto'] ?? 700,
            'orden' => (int) DiningRoom::where('sucursal_id', $branchId)->max('orden') + 1,
        ])->refresh();
    }

    public function updateRoom(DiningRoom $room, array $data): DiningRoom
    {
        $room->update(Arr::only($data, ['nombre', 'es_activo']));

        return $room;
    }

    public function deleteRoom(DiningRoom $room): void
    {
        $busy = $room->activeTables()->where('estado', '!=', DiningTable::FREE)->pluck('codigo');

        if ($busy->isNotEmpty()) {
            throw new BusinessException('SALON_EN_USO', 'El salón tiene mesas ocupadas o por cobrar. Ciérralas antes de eliminarlo.', 409, ['mesas' => $busy->all()]);
        }

        $room->delete();
    }

    /** @param list<int> $ids todos los salones de la sucursal, en el nuevo orden */
    public function reorderRooms(array $ids): void
    {
        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $order => $id) {
                DiningRoom::whereKey($id)->update(['orden' => $order, 'actualizado_en' => now()]);
            }
        });
    }

    public function savePlan(DiningRoom $room, array $data): DiningRoom
    {
        return DB::transaction(function () use ($room, $data) {
            // FOR UPDATE: dos guardados con la misma version no pueden pasar ambos.
            $locked = DiningRoom::whereKey($room->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->version !== (int) $data['version']) {
                throw new BusinessException(
                    'PLANO_DESACTUALIZADO',
                    'Alguien actualizó este plano mientras editabas. Recarga para ver la última versión.',
                    409,
                    ['version_actual' => $locked->version],
                );
            }

            $this->syncTables($locked, $data['mesas']);

            $locked->elements()->delete();
            foreach ($data['elementos'] as $element) {
                $locked->elements()->create(Arr::only($element, ['tipo', 'etiqueta', 'capa', ...self::GEOMETRY]) + ['capa' => 0]);
            }

            $locked->fill(Arr::only($data, ['ancho', 'alto']));
            $locked->version++;
            $locked->save();

            return $locked;
        });
    }

    /**
     * Las mesas no se borran: tendran historial de pedidos. Las que salen del plano se
     * desactivan y una mesa nueva con el codigo de una retirada la reactiva.
     *
     * @param  list<array<string, mixed>>  $incoming
     */
    private function syncTables(DiningRoom $room, array $incoming): void
    {
        /** @var Collection<int, DiningTable> $rows */
        $rows = $room->tables()->get()->keyBy('id');
        $referenced = collect($incoming)->pluck('id')->filter()->map(fn ($id) => (int) $id)->all();

        // Una mesa nueva con el codigo de una que no sigue en el plano es esa misma mesa.
        foreach ($incoming as $index => $table) {
            if (! isset($table['id'])) {
                $previous = $rows->first(fn (DiningTable $row) => $row->codigo === $table['codigo'] && ! in_array($row->id, $referenced, true));
                if ($previous) {
                    $incoming[$index]['id'] = $previous->id;
                    $referenced[] = $previous->id;
                }
            }
        }

        $removed = $rows->filter(fn (DiningTable $table) => $table->es_activa && ! in_array($table->id, $referenced, true));
        $busy = $removed->where('estado', '!=', DiningTable::FREE)->pluck('codigo');

        if ($busy->isNotEmpty()) {
            throw new BusinessException('MESA_EN_USO', 'No puedes quitar mesas ocupadas o por cobrar: '.$busy->implode(', ').'.', 409, ['mesas' => $busy->values()->all()]);
        }

        // Codigos libres antes de asignar: el UNIQUE (salon_id, codigo) se valida fila por fila.
        $finalCodes = array_column($incoming, 'codigo');
        foreach ($rows as $row) {
            $kept = in_array($row->id, $referenced, true);
            $changes = $kept && collect($incoming)->firstWhere('id', $row->id)['codigo'] !== $row->codigo;

            if ($changes || (! $kept && in_array($row->codigo, $finalCodes, true))) {
                $row->update(['codigo' => '~'.$row->id]);
            }
            if (! $kept && $row->es_activa) {
                $row->update(['es_activa' => false]);
            }
        }

        foreach ($incoming as $table) {
            $attributes = Arr::only($table, ['codigo', 'capacidad', 'forma', ...self::GEOMETRY]) + ['es_activa' => true];

            isset($table['id'])
                ? $rows[$table['id']]->update($attributes)
                : $room->tables()->create($attributes);
        }
    }
}
