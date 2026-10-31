<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Modules\Restaurant\Application\GetAnalytics;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Tablero de ventas del administrador (spec 039). */
class AnalyticsController
{
    public function index(Request $request, GetAnalytics $analytics): JsonResponse
    {
        $data = $request->validate([
            'desde' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'hasta' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
            'sucursal_id' => ['sometimes', 'nullable', 'integer'],
            'agrupar' => ['sometimes', 'nullable', Rule::in(['dia', 'mes', 'anio'])],
        ], [
            'hasta.after_or_equal' => 'La fecha de fin no puede ser anterior al inicio.',
        ]);

        $branchId = isset($data['sucursal_id']) ? (int) $data['sucursal_id'] : null;
        if ($branchId !== null && ! $request->user()->worksAt($branchId)) {
            throw new AccessDeniedHttpException;
        }

        return response()->json(['data' => $analytics->handle($request->user(), $data)]);
    }
}
