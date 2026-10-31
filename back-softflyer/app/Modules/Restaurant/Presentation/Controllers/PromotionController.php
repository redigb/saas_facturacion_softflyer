<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Modules\Restaurant\Application\ManagePromotions;
use App\Modules\Restaurant\Infrastructure\Persistence\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Promociones de precio de la carta (spec 039). */
class PromotionController
{
    public function __construct(private readonly ManagePromotions $promotions) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->promotions->list()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $promotion = $this->promotions->save($data);

        return response()->json(['data' => $promotion], 201);
    }

    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        return response()->json(['data' => $this->promotions->save($this->validated($request), $promotion)]);
    }

    public function destroy(Promotion $promotion): JsonResponse
    {
        $this->promotions->delete($promotion);

        return response()->json(['data' => ['id' => $promotion->id]]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:80'],
            'descripcion' => ['nullable', 'string', 'max:160'],
            'tipo' => ['required', Rule::in([Promotion::PERCENTAGE, Promotion::FIXED])],
            'valor' => ['required', 'numeric', 'gt:0', 'max:9999999.99', 'decimal:0,2'],
            'desde' => ['required', 'date'],
            'hasta' => ['required', 'date', 'after:desde'],
            'dias_semana' => ['sometimes', 'array', 'max:7'],
            'dias_semana.*' => ['integer', 'between:1,7', 'distinct'],
            'hora_inicio' => ['nullable', 'date_format:H:i', 'required_with:hora_fin'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'required_with:hora_inicio', 'after:hora_inicio'],
            'prioridad' => ['sometimes', 'integer', 'between:0,99'],
            'es_activa' => ['sometimes', 'boolean'],
            'producto_ids' => ['sometimes', 'array', 'max:200'],
            'producto_ids.*' => ['integer', 'distinct', Rule::exists('productos', 'id')],
            'categoria_ids' => ['sometimes', 'array', 'max:50'],
            'categoria_ids.*' => ['integer', 'distinct', Rule::exists('categorias', 'id')],
        ], [
            'nombre.required' => 'Ponle un nombre a la promoción.',
            'hasta.after' => 'La fecha de fin debe ser posterior al inicio.',
            'hora_fin.after' => 'La hora de fin debe ser posterior al inicio.',
            'dias_semana.*.between' => 'Elige días entre lunes y domingo.',
        ]);

        if ($data['tipo'] === Promotion::PERCENTAGE && (float) $data['valor'] > 100) {
            throw ValidationException::withMessages(['valor' => ['Un descuento porcentual no puede superar el 100%.']]);
        }

        return $data;
    }
}
