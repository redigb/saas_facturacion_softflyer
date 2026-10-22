<?php

namespace App\Core\Iam\Application;

use App\Core\Iam\Infrastructure\Persistence\AttendanceMark;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Iam\Infrastructure\Persistence\WorkSchedule;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Shared\Exceptions\BusinessException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Reglas de asistencia de la spec 032. El teléfono aporta posición, nunca la hora. */
final class ManageAttendance
{
    private const TIMEZONE = 'America/Lima';

    private const MAX_ACCURACY_METERS = 100.0;

    public function myDay(User $user, Branch $branch): array
    {
        $this->ensureBranchAccess($user, $branch);
        $now = CarbonImmutable::now(self::TIMEZONE);
        $schedule = $this->scheduleFor($user, $branch, $now->dayOfWeekIso);
        $marks = $this->marksForDay($user->id, $branch->id, $now);

        return [
            'servidor_ahora' => $now->utc()->toIso8601ZuluString(),
            'zona_horaria' => self::TIMEZONE,
            'sucursal' => $this->branchData($branch),
            'horario' => $schedule ? $this->scheduleData($schedule) : null,
            'proxima_marcacion' => $this->nextType($user, $branch, $now),
            'marcaciones' => $marks->map(fn (AttendanceMark $mark) => $this->markData($mark))->values()->all(),
        ];
    }

    /** @param array{latitud: float, longitud: float, precision_metros: float} $position */
    public function mark(User $user, Branch $branch, array $position): array
    {
        $this->ensureBranchAccess($user, $branch);
        $this->ensureGeofence($branch);

        $accuracy = (float) $position['precision_metros'];
        if ($accuracy > self::MAX_ACCURACY_METERS) {
            throw new BusinessException(
                'UBICACION_IMPRECISA',
                'La señal GPS todavía es imprecisa. Acércate a una ventana o sal al ingreso e inténtalo nuevamente.',
                422,
                ['precision_metros' => $accuracy, 'maximo_metros' => self::MAX_ACCURACY_METERS],
            );
        }

        $distance = $this->distanceMeters(
            (float) $branch->latitud,
            (float) $branch->longitud,
            (float) $position['latitud'],
            (float) $position['longitud'],
        );
        if ($distance > (float) $branch->radio_geocerca_metros) {
            throw new BusinessException(
                'FUERA_DE_GEOCERCA',
                'Tu ubicación está fuera de la zona de asistencia de este local.',
                422,
                ['distancia_metros' => round($distance, 2), 'radio_metros' => $branch->radio_geocerca_metros],
            );
        }

        return DB::transaction(function () use ($user, $branch, $position, $accuracy, $distance) {
            $now = CarbonImmutable::now(self::TIMEZONE);
            $latest = AttendanceMark::where('usuario_id', $user->id)
                ->where('sucursal_id', $branch->id)
                ->latest('marcado_en')
                ->lockForUpdate()
                ->first();
            $type = $this->nextTypeFrom($latest, $now);

            $schedule = $type === 'SALIDA'
                ? $this->scheduleForDateOfOpenEntry($user, $branch, $latest, $now)
                : $this->scheduleFor($user, $branch, $now->dayOfWeekIso);
            if ($schedule === null) {
                throw new BusinessException('SIN_HORARIO_HOY', 'No tienes un horario activo para hoy en este local.', 422);
            }

            $status = 'REGISTRADA';
            if ($type === 'ENTRADA') {
                $limit = CarbonImmutable::parse($now->toDateString().' '.$schedule->hora_entrada, self::TIMEZONE)
                    ->addMinutes($schedule->tolerancia_minutos);
                $status = $now->lessThanOrEqualTo($limit) ? 'PUNTUAL' : 'TARDANZA';
            }

            $mark = AttendanceMark::create([
                'usuario_id' => $user->id,
                'sucursal_id' => $branch->id,
                'tipo' => $type,
                'marcado_en' => $now->utc(),
                'latitud' => $position['latitud'],
                'longitud' => $position['longitud'],
                'precision_metros' => round($accuracy, 2),
                'distancia_metros' => round($distance, 2),
                'estado' => $status,
            ]);

            return [
                'marcacion' => $this->markData($mark),
                'jornada' => $this->myDay($user, $branch),
            ];
        });
    }

    public function schedule(User $actor, User $user): ?array
    {
        $schedule = WorkSchedule::with('branch')->where('usuario_id', $user->id)->where('es_activo', true)->first();
        if ($schedule !== null) {
            $this->ensureBranchAccess($actor, $schedule->branch);
        }

        return $schedule ? $this->scheduleData($schedule) : null;
    }

    /** @param array{sucursal_id: int, dias_semana: list<int>, hora_entrada: string, hora_salida: string, tolerancia_minutos: int, es_activo?: bool} $data */
    public function saveSchedule(User $actor, User $user, array $data): array
    {
        $branch = Branch::whereKey($data['sucursal_id'])->where('es_activa', true)->firstOrFail();
        $this->ensureBranchAccess($actor, $branch);
        if (! $user->worksAt($branch->id)) {
            throw new BusinessException('SUCURSAL_NO_AUTORIZADA', 'Esta persona no trabaja en la sucursal elegida.', 403);
        }

        return DB::transaction(function () use ($user, $branch, $data) {
            WorkSchedule::where('usuario_id', $user->id)->whereKeyNot(
                WorkSchedule::where('usuario_id', $user->id)->where('sucursal_id', $branch->id)->value('id') ?? 0,
            )->update(['es_activo' => false]);

            $schedule = WorkSchedule::updateOrCreate(
                ['usuario_id' => $user->id, 'sucursal_id' => $branch->id],
                [
                    'dias_semana' => array_values(array_unique(array_map('intval', $data['dias_semana']))),
                    'hora_entrada' => $data['hora_entrada'],
                    'hora_salida' => $data['hora_salida'],
                    'tolerancia_minutos' => $data['tolerancia_minutos'],
                    'es_activo' => $data['es_activo'] ?? true,
                ],
            );

            return $this->scheduleData($schedule->load('branch'));
        });
    }

    public function summary(User $actor, Branch $branch, CarbonImmutable $date): array
    {
        $this->ensureBranchAccess($actor, $branch);
        $start = $date->setTimezone(self::TIMEZONE)->startOfDay();
        $end = $start->addDay();
        $day = $start->dayOfWeekIso;
        $schedules = WorkSchedule::with(['user.roles', 'branch'])
            ->where('sucursal_id', $branch->id)
            ->where('es_activo', true)
            ->orderBy('hora_entrada')
            ->get()
            ->filter(fn (WorkSchedule $schedule) => in_array($day, $schedule->dias_semana, true));
        $marks = AttendanceMark::where('sucursal_id', $branch->id)
            ->whereBetween('marcado_en', [$start->utc(), $end->utc()])
            ->orderBy('marcado_en')
            ->get()
            ->groupBy('usuario_id');

        return [
            'fecha' => $start->toDateString(),
            'servidor_ahora' => CarbonImmutable::now(self::TIMEZONE)->utc()->toIso8601ZuluString(),
            'sucursal' => $this->branchData($branch),
            'personas' => $schedules->map(function (WorkSchedule $schedule) use ($marks) {
                /** @var Collection<int, AttendanceMark> $userMarks */
                $userMarks = $marks->get($schedule->usuario_id, collect());

                return [
                    'usuario' => [
                        'id' => $schedule->user->id,
                        'nombre' => $schedule->user->nombre,
                        'roles' => $schedule->user->roles->pluck('nombre')->values()->all(),
                    ],
                    'horario' => $this->scheduleData($schedule),
                    'estado' => $userMarks->isEmpty()
                        ? 'SIN_MARCAR'
                        : ($userMarks->firstWhere('tipo', 'ENTRADA')?->estado ?? 'EN_JORNADA'),
                    'marcaciones' => $userMarks->map(fn (AttendanceMark $mark) => $this->markData($mark))->values()->all(),
                ];
            })->values()->all(),
        ];
    }

    private function scheduleFor(User $user, Branch $branch, int $day): ?WorkSchedule
    {
        return WorkSchedule::with('branch')
            ->where('usuario_id', $user->id)
            ->where('sucursal_id', $branch->id)
            ->where('es_activo', true)
            ->get()
            ->first(fn (WorkSchedule $schedule) => in_array($day, $schedule->dias_semana, true));
    }

    private function scheduleForDateOfOpenEntry(User $user, Branch $branch, ?AttendanceMark $latest, CarbonImmutable $now): ?WorkSchedule
    {
        $day = $latest?->marcado_en?->setTimezone(self::TIMEZONE)->dayOfWeekIso ?? $now->dayOfWeekIso;

        return $this->scheduleFor($user, $branch, $day);
    }

    /** @return Collection<int, AttendanceMark> */
    private function marksForDay(int $userId, int $branchId, CarbonImmutable $day): Collection
    {
        $start = $day->startOfDay();

        return AttendanceMark::where('usuario_id', $userId)
            ->where('sucursal_id', $branchId)
            ->whereBetween('marcado_en', [$start->utc(), $start->addDay()->utc()])
            ->orderBy('marcado_en')
            ->get();
    }

    private function nextType(User $user, Branch $branch, CarbonImmutable $now): string
    {
        $latest = AttendanceMark::where('usuario_id', $user->id)->where('sucursal_id', $branch->id)->latest('marcado_en')->first();

        return $this->nextTypeFrom($latest, $now);
    }

    private function nextTypeFrom(?AttendanceMark $latest, CarbonImmutable $now): string
    {
        if ($latest?->tipo === 'ENTRADA' && $latest->marcado_en->greaterThanOrEqualTo($now->subHours(18)->utc())) {
            return 'SALIDA';
        }

        return 'ENTRADA';
    }

    private function ensureBranchAccess(User $user, Branch $branch): void
    {
        if (! $branch->es_activa || ! $user->worksAt($branch->id)) {
            throw new BusinessException('SUCURSAL_NO_AUTORIZADA', 'No tienes acceso a esta sucursal.', 403);
        }
    }

    private function ensureGeofence(Branch $branch): void
    {
        if ($branch->latitud === null || $branch->longitud === null || $branch->radio_geocerca_metros === null) {
            throw new BusinessException('GEOCERCA_NO_CONFIGURADA', 'El administrador todavía no configuró la zona de asistencia de este local.', 422);
        }
    }

    private function distanceMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earth = 6_371_000.0;
        $latitude = deg2rad($toLat - $fromLat);
        $longitude = deg2rad($toLng - $fromLng);
        $a = sin($latitude / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($longitude / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function branchData(Branch $branch): array
    {
        return [
            'id' => $branch->id,
            'nombre' => $branch->nombre,
            'geocerca' => $branch->latitud === null ? null : [
                'latitud' => (float) $branch->latitud,
                'longitud' => (float) $branch->longitud,
                'radio_metros' => (int) $branch->radio_geocerca_metros,
            ],
        ];
    }

    private function scheduleData(WorkSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'usuario_id' => $schedule->usuario_id,
            'sucursal' => ['id' => $schedule->branch->id, 'nombre' => $schedule->branch->nombre],
            'dias_semana' => array_values($schedule->dias_semana),
            'hora_entrada' => substr((string) $schedule->hora_entrada, 0, 5),
            'hora_salida' => substr((string) $schedule->hora_salida, 0, 5),
            'tolerancia_minutos' => (int) $schedule->tolerancia_minutos,
            'es_activo' => (bool) $schedule->es_activo,
        ];
    }

    private function markData(AttendanceMark $mark): array
    {
        return [
            'id' => $mark->id,
            'tipo' => $mark->tipo,
            'marcado_en' => $mark->marcado_en->utc()->toIso8601ZuluString(),
            'estado' => $mark->estado,
            'precision_metros' => (float) $mark->precision_metros,
            'distancia_metros' => (float) $mark->distancia_metros,
        ];
    }
}
