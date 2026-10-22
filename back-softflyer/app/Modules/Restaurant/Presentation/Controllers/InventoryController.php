<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Application\ManageRestaurantInventory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class InventoryController
{
    public function __construct(private readonly ManageRestaurantInventory $inventory) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['sometimes', 'integer'],
            'almacen_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        return response()->json(['data' => $this->inventory->dashboard(
            $request->user(),
            $this->branchId($request, $data),
            isset($data['almacen_id']) ? (int) $data['almacen_id'] : null,
        )]);
    }

    public function catalogs(Request $request): JsonResponse
    {
        $data = $request->validate(['sucursal_id' => ['sometimes', 'integer']]);

        return response()->json(['data' => $this->inventory->catalogs($request->user(), $this->branchId($request, $data))]);
    }

    public function storeItem(Request $request): JsonResponse
    {
        $data = $this->itemData($request);

        return response()->json(['data' => $this->inventory->saveItem($request->user(), null, $data)], 201);
    }

    public function updateItem(Request $request, Product $product): JsonResponse
    {
        return response()->json(['data' => $this->inventory->saveItem($request->user(), $product, $this->itemData($request, $product))]);
    }

    public function movement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'almacen_id' => ['required', 'integer'],
            'producto_id' => ['required', 'integer'],
            'tipo' => ['required', Rule::in(['ENTRADA', 'SALIDA', 'MERMA'])],
            'cantidad' => ['required', 'numeric', 'gt:0', 'max:9999999999', 'decimal:0,4'],
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ], [
            'cantidad.gt' => 'La cantidad debe ser mayor que cero.',
            'motivo.required' => 'Explica el motivo del movimiento.',
        ]);

        return response()->json(['data' => $this->inventory->movement($request->user(), $data)], 201);
    }

    public function count(Request $request): JsonResponse
    {
        $data = $request->validate([
            'almacen_id' => ['required', 'integer'],
            'producto_id' => ['required', 'integer'],
            'cantidad_contada' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999', 'decimal:0,4'],
            'cantidad_disponible' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999', 'decimal:0,4'],
            'cantidad_danada' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999', 'decimal:0,4'],
            'cantidad_perdida' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999', 'decimal:0,4'],
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $product = Product::query()->whereKey($data['producto_id'])->where('controla_stock', true)->firstOrFail();
        if ($product->naturaleza_inventario === 'REUTILIZABLE') {
            foreach (['cantidad_disponible', 'cantidad_danada', 'cantidad_perdida'] as $field) {
                if (! array_key_exists($field, $data) || $data[$field] === null) {
                    throw ValidationException::withMessages([$field => ['Completa el conteo por estado.']]);
                }
            }
        } elseif (! array_key_exists('cantidad_contada', $data) || $data['cantidad_contada'] === null) {
            throw ValidationException::withMessages(['cantidad_contada' => ['Ingresa la cantidad contada.']]);
        }

        return response()->json(['data' => $this->inventory->count($request->user(), $data)], 201);
    }

    public function ledger(Request $request): JsonResponse
    {
        $data = $request->validate([
            'almacen_id' => ['required', 'integer'],
            'producto_id' => ['sometimes', 'nullable', 'integer'],
            'despues_de' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        return response()->json(['data' => $this->inventory->ledger(
            $request->user(),
            (int) $data['almacen_id'],
            isset($data['producto_id']) ? (int) $data['producto_id'] : null,
            isset($data['despues_de']) ? (int) $data['despues_de'] : null,
        )]);
    }

    /** @return array<string, mixed> */
    private function itemData(Request $request, ?Product $product = null): array
    {
        if ($request->has('codigo')) {
            $request->merge(['codigo' => mb_strtoupper(trim((string) $request->input('codigo'))) ?: null]);
        }

        return $request->validate([
            'almacen_id' => ['required', 'integer'],
            'nombre' => ['required', 'string', 'max:120'],
            'codigo' => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('productos', 'codigo')->whereNull('eliminado_en')->ignore($product?->id)],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unidad_medida_id' => ['required', 'integer', Rule::exists('unidades_medida', 'id')->where('es_activo', true)],
            'categoria_inventario' => ['required', Rule::in(['ALIMENTO', 'BEBIDA', 'LIMPIEZA', 'EMPAQUE', 'UTENSILIO', 'EQUIPO', 'OTRO'])],
            'naturaleza_inventario' => ['required', Rule::in(['CONSUMIBLE', 'REUTILIZABLE'])],
            'stock_minimo' => ['required', 'numeric', 'min:0', 'max:9999999999', 'decimal:0,4'],
            'es_activo' => ['sometimes', 'boolean'],
        ], [
            'nombre.required' => 'Escribe el nombre del artículo.',
            'codigo.unique' => 'Ya existe un artículo con ese código.',
            'stock_minimo.required' => 'Define el stock mínimo para este almacén.',
        ]);
    }

    /** @param array<string, mixed> $data */
    private function branchId(Request $request, array $data): int
    {
        return (int) ($data['sucursal_id'] ?? $request->user()->branches()->first()?->id ?? throw new AccessDeniedHttpException);
    }
}
