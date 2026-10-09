<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Modules\Restaurant\Application\ManageFloorPlan;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningRoom;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningTable;
use App\Modules\Restaurant\Infrastructure\Persistence\FloorElement;
use App\Modules\Restaurant\Infrastructure\Realtime\FloorPlanUpdated;
use App\Modules\Restaurant\Presentation\Requests\FloorPlanRequest;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/** Salones y plano (spec 003, specs/003-plano/backend.md). */
class DiningRoomController
{
    public function __construct(private readonly ManageFloorPlan $plan) {}

    public function index(Request $request): JsonResponse
    {
        $rooms = DiningRoom::withCount('activeTables')
            ->when($request->integer('sucursal_id'), fn ($query, int $branch) => $query->where('sucursal_id', $branch))
            ->orderBy('orden')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $rooms->map(fn (DiningRoom $room) => $this->room($room))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:60', $this->uniqueName($request->integer('sucursal_id') ?: null)],
            'ancho' => ['sometimes', 'integer', 'between:200,5000'],
            'alto' => ['sometimes', 'integer', 'between:200,5000'],
            'sucursal_id' => ['sometimes', 'integer', Rule::exists('sucursales', 'id')->whereNull('eliminado_en')],
        ], $this->messages());

        return response()->json(['data' => $this->room($this->plan->createRoom($data))], 201);
    }

    public function update(Request $request, DiningRoom $room): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:60', $this->uniqueName($room->sucursal_id, $room)],
            'es_activo' => ['sometimes', 'boolean'],
        ], $this->messages());

        return response()->json(['data' => $this->room($this->plan->updateRoom($room, $data))]);
    }

    public function destroy(DiningRoom $room): Response
    {
        $this->plan->deleteRoom($room);

        return response()->noContent();
    }

    public function reorder(Request $request): Response
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', Rule::exists('salones', 'id')->whereNull('eliminado_en')],
        ], ['ids.*.exists' => 'Uno de los salones no existe.']);

        $this->plan->reorderRooms($data['ids']);

        return response()->noContent();
    }

    public function showPlan(DiningRoom $room): JsonResponse
    {
        return response()->json(['data' => $this->planPayload($room)]);
    }

    public function savePlan(FloorPlanRequest $request, DiningRoom $room): JsonResponse
    {
        $saved = $this->plan->savePlan($room, $request->validated());

        // Después del commit: avisa a quien tenga el plano abierto (spec 005).
        event(new FloorPlanUpdated($saved->sucursal_id, $saved->id, $saved->version, $request->user()->getKey()));

        return response()->json(['data' => $this->planPayload($saved)]);
    }

    private function room(DiningRoom $room): array
    {
        return [
            'id' => $room->id,
            'sucursal_id' => $room->sucursal_id,
            'nombre' => $room->nombre,
            'ancho' => $room->ancho,
            'alto' => $room->alto,
            'orden' => $room->orden,
            'version' => $room->version,
            'es_activo' => $room->es_activo,
            'mesas_count' => (int) ($room->active_tables_count ?? $room->activeTables()->count()),
        ];
    }

    private function planPayload(DiningRoom $room): array
    {
        return [
            'salon' => $room->only(['id', 'nombre', 'ancho', 'alto', 'version']),
            'mesas' => $room->activeTables()->orderBy('id')->get()->map(fn (DiningTable $table) => $table->only([
                'id', 'codigo', 'capacidad', 'forma', 'pos_x', 'pos_y', 'ancho', 'alto', 'rotacion', 'estado',
            ]))->all(),
            'elementos' => $room->elements()->orderBy('capa')->orderBy('id')->get()->map(fn (FloorElement $element) => $element->only([
                'id', 'tipo', 'etiqueta', 'pos_x', 'pos_y', 'ancho', 'alto', 'rotacion', 'capa',
            ]))->all(),
        ];
    }

    private function uniqueName(?int $branchId, ?DiningRoom $current = null): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($branchId, $current) {
            $taken = DiningRoom::whereRaw('lower(nombre) = lower(?)', [trim((string) $value)])
                ->when($branchId, fn ($query) => $query->where('sucursal_id', $branchId))
                ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                ->exists();

            if ($taken) {
                $fail('Ya tienes un salón con ese nombre.');
            }
        };
    }

    private function messages(): array
    {
        return [
            'nombre.required' => 'Ponle un nombre al salón.',
            'nombre.max' => 'El nombre puede tener hasta 60 caracteres.',
            'ancho.between' => 'El ancho va de 200 a 5000.',
            'alto.between' => 'El alto va de 200 a 5000.',
        ];
    }
}
