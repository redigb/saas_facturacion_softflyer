<?php

namespace App\Core\Iam\Presentation\Controllers;

use App\Core\Iam\Application\ManageAttendance;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Asistencia geolocalizada (spec 032). */
class AttendanceController
{
    public function __construct(private readonly ManageAttendance $attendance) {}

    public function myDay(Request $request): JsonResponse
    {
        $data = $request->validate(['sucursal_id' => ['required', 'integer']]);
        $branch = Branch::findOrFail($data['sucursal_id']);

        return response()->json(['data' => $this->attendance->myDay($request->user(), $branch)]);
    }

    public function mark(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['required', 'integer'],
            'latitud' => ['required', 'numeric', 'between:-90,90'],
            'longitud' => ['required', 'numeric', 'between:-180,180'],
            'precision_metros' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);
        $branch = Branch::findOrFail($data['sucursal_id']);

        return response()->json(['data' => $this->attendance->mark($request->user(), $branch, [
            'latitud' => (float) $data['latitud'],
            'longitud' => (float) $data['longitud'],
            'precision_metros' => (float) $data['precision_metros'],
        ])], 201);
    }

    public function schedule(Request $request, User $user): JsonResponse
    {
        return response()->json(['data' => $this->attendance->schedule($request->user(), $user)]);
    }

    public function saveSchedule(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['required', 'integer', Rule::exists('sucursales', 'id')->where('es_activa', true)],
            'dias_semana' => ['required', 'array', 'min:1'],
            'dias_semana.*' => ['required', 'integer', 'between:1,7', 'distinct'],
            'hora_entrada' => ['required', 'date_format:H:i'],
            'hora_salida' => ['required', 'date_format:H:i', 'different:hora_entrada'],
            'tolerancia_minutos' => ['required', 'integer', 'between:0,120'],
            'es_activo' => ['sometimes', 'boolean'],
        ], [
            'dias_semana.min' => 'Elige al menos un día de trabajo.',
            'hora_salida.different' => 'La entrada y la salida no pueden ser iguales.',
        ]);

        return response()->json(['data' => $this->attendance->saveSchedule($request->user(), $user, $data)]);
    }

    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['required', 'integer'],
            'fecha' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $branch = Branch::findOrFail($data['sucursal_id']);
        $date = isset($data['fecha'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $data['fecha'], 'America/Lima')->startOfDay()
            : CarbonImmutable::now('America/Lima');

        return response()->json(['data' => $this->attendance->summary($request->user(), $branch, $date)]);
    }
}
