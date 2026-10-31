<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Application\ManagePreparations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class PreparationController
{
    public function __construct(private readonly ManagePreparations $preparations) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['sometimes', 'integer'],
            'estacion_id' => ['required', Rule::when(
                $request->input('estacion_id') !== 'general',
                ['integer', Rule::exists('estaciones_preparacion', 'id')->where('es_activa', true)],
                ['in:general'],
            )],
        ]);

        return response()->json(['data' => $this->preparations->list(
            $request->user(),
            $this->branchId($request, $data),
            $data['estacion_id'],
        )]);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate(['sucursal_id' => ['sometimes', 'integer']]);

        return response()->json(['data' => $this->preparations->show($request->user(), $this->branchId($request, $data), $product)]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['sometimes', 'integer'],
            'ingredientes' => ['required', 'array', 'max:50'],
            'ingredientes.*.nombre' => ['required', 'string', 'max:120'],
            'ingredientes.*.cantidad' => ['sometimes', 'nullable', 'string', 'max:60'],
            'ingredientes.*.unidad' => ['sometimes', 'nullable', 'string', 'max:8', Rule::in(ManagePreparations::UNIDADES)],
            'procedimiento' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'notas' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ], [
            'ingredientes.max' => 'Puedes registrar hasta 50 ingredientes por preparación.',
            'ingredientes.*.nombre.required' => 'Escribe el nombre del ingrediente.',
        ]);

        return response()->json(['data' => $this->preparations->save(
            $request->user(),
            $this->branchId($request, $data),
            $product,
            $data['ingredientes'],
            $data['procedimiento'] ?? null,
            $data['notas'] ?? null,
        )]);
    }

    private function branchId(Request $request, array $data): int
    {
        return (int) ($data['sucursal_id'] ?? $request->user()->branches()->first()?->id ?? throw new AccessDeniedHttpException);
    }
}
