<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

/** Canal de una estación; las comandas sin estación van a "general" (spec 006). */
final class StationChannel
{
    public static function name(int $branchId, ?int $stationId): string
    {
        return "sucursal.{$branchId}.estacion.".($stationId ?? 'general');
    }
}
