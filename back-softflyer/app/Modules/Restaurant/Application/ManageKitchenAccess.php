<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Asignaciones de personal a estaciones KDS (spec 030). */
final class ManageKitchenAccess
{
    private const COOK = 'restaurante.cocina.actualizar_estado';

    private const SUPERVISOR = 'panel.ver';

    public function __construct(private readonly TenantContext $context) {}

    /** @return list<array{id: int|string, nombre: string}> */
    public function stations(User $user, int $branchId): array
    {
        if (! $user->worksAt($branchId) || (! $user->hasPermission(self::COOK) && ! $user->hasPermission(self::SUPERVISOR))) {
            throw new AccessDeniedHttpException;
        }

        $stations = PreparationStation::query()
            ->where('es_activa', true)
            ->when(! $user->hasPermission(self::SUPERVISOR), fn ($query) => $query->whereIn('id', DB::table('usuario_estacion_preparacion')
                ->where('usuario_id', $user->id)
                ->whereNotNull('estacion_preparacion_id')
                ->select('estacion_preparacion_id')))
            ->orderBy('nombre')
            ->get(['id', 'nombre'])
            ->map(fn (PreparationStation $station) => ['id' => $station->id, 'nombre' => $station->nombre])
            ->all();

        $seesGeneral = $user->hasPermission(self::SUPERVISOR)
            || DB::table('usuario_estacion_preparacion')->where('usuario_id', $user->id)->whereNull('estacion_preparacion_id')->exists();

        if ($seesGeneral) {
            $stations[] = ['id' => 'general', 'nombre' => 'General (sin estación)'];
        }

        return $stations;
    }

    /** @return array{usuario_id: int, estacion_ids: list<int>, general: bool} */
    public function configuration(User $user): array
    {
        $rows = DB::table('usuario_estacion_preparacion')
            ->where('usuario_id', $user->id)
            ->orderBy('estacion_preparacion_id')
            ->get(['estacion_preparacion_id']);

        return [
            'usuario_id' => $user->id,
            'estacion_ids' => $rows->pluck('estacion_preparacion_id')->filter(fn ($id) => $id !== null)->map(fn ($id) => (int) $id)->values()->all(),
            'general' => $rows->contains(fn ($row) => $row->estacion_preparacion_id === null),
        ];
    }

    /** @param list<int> $stationIds */
    public function sync(User $user, array $stationIds, bool $general): array
    {
        $stationIds = array_values(array_unique(array_map('intval', $stationIds)));

        if (($stationIds !== [] || $general) && ! $user->hasPermission(self::COOK)) {
            throw ValidationException::withMessages(['usuario' => ['Esta persona necesita un rol de cocina para usar el KDS.']]);
        }

        DB::transaction(function () use ($user, $stationIds, $general) {
            DB::table('usuario_estacion_preparacion')->where('usuario_id', $user->id)->delete();

            $rows = array_map(fn (int $stationId) => [
                'inquilino_id' => $this->context->id(),
                'usuario_id' => $user->id,
                'estacion_preparacion_id' => $stationId,
            ], $stationIds);

            if ($general) {
                $rows[] = [
                    'inquilino_id' => $this->context->id(),
                    'usuario_id' => $user->id,
                    'estacion_preparacion_id' => null,
                ];
            }

            if ($rows !== []) {
                DB::table('usuario_estacion_preparacion')->insert($rows);
            }
        });

        return $this->configuration($user);
    }

    public function canUse(User $user, int $branchId, ?int $stationId): bool
    {
        if (! $user->worksAt($branchId)) {
            return false;
        }
        if ($stationId !== null && ! PreparationStation::whereKey($stationId)->where('es_activa', true)->exists()) {
            return false;
        }
        if ($user->hasPermission(self::SUPERVISOR)) {
            return true;
        }
        if (! $user->hasPermission(self::COOK)) {
            return false;
        }

        return DB::table('usuario_estacion_preparacion')
            ->where('usuario_id', $user->id)
            ->when($stationId === null, fn ($query) => $query->whereNull('estacion_preparacion_id'), fn ($query) => $query->where('estacion_preparacion_id', $stationId))
            ->exists();
    }

    public function authorize(User $user, int $branchId, ?int $stationId): void
    {
        if (! $this->canUse($user, $branchId, $stationId)) {
            throw new AccessDeniedHttpException;
        }
    }
}
