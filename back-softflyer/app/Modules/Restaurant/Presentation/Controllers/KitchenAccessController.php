<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Application\ManageKitchenAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Configuración y selector de estaciones autorizadas del KDS (spec 030). */
final class KitchenAccessController
{
    public function __construct(private readonly ManageKitchenAccess $access) {}

    public function stations(Request $request): JsonResponse
    {
        $data = $request->validate(['sucursal_id' => ['sometimes', 'integer']]);
        $branchId = $data['sucursal_id'] ?? $request->user()->branches()->first()?->id ?? throw new AccessDeniedHttpException;

        return response()->json(['data' => $this->access->stations($request->user(), (int) $branchId)]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $this->access->configuration($user)]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'estacion_ids' => ['required', 'array'],
            'estacion_ids.*' => ['integer', 'distinct', Rule::exists('estaciones_preparacion', 'id')->where('es_activa', true)],
            'general' => ['required', 'boolean'],
        ], [
            'estacion_ids.required' => 'Indica las estaciones KDS de esta persona.',
            'estacion_ids.*.exists' => 'Una de las estaciones ya no está activa.',
            'general.required' => 'Indica si puede atender la bandeja General.',
        ]);

        return response()->json(['data' => $this->access->sync($user, $data['estacion_ids'], $data['general'])]);
    }
}
