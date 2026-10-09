<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use App\Modules\Restaurant\Presentation\MenuPresenter;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StationController
{
    public function __construct(private readonly MenuPresenter $presenter) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => PreparationStation::orderBy('nombre')->get()
            ->map(fn (PreparationStation $station) => $this->presenter->station($station))]);
    }

    public function store(Request $request): JsonResponse
    {
        $station = PreparationStation::create($this->validated($request));

        return response()->json(['data' => $this->presenter->station($station->refresh())], 201);
    }

    public function update(Request $request, PreparationStation $station): JsonResponse
    {
        $station->update($this->validated($request, $station));

        return response()->json(['data' => $this->presenter->station($station)]);
    }

    private function validated(Request $request, ?PreparationStation $current = null): array
    {
        return $request->validate([
            'nombre' => [$current ? 'sometimes' : 'required', 'string', 'max:60', function (string $attribute, mixed $value, Closure $fail) use ($current) {
                $taken = PreparationStation::whereRaw('lower(nombre) = lower(?)', [trim((string) $value)])
                    ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                    ->exists();

                if ($taken) {
                    $fail('Ya tienes una estación con ese nombre.');
                }
            }],
            'es_activa' => ['sometimes', 'boolean'],
        ], [
            'nombre.required' => 'Ponle un nombre a la estación.',
        ]);
    }
}
