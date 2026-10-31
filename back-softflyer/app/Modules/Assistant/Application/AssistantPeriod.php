<?php

namespace App\Modules\Assistant\Application;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/** Rangos de tiempo del asistente, siempre en la zona del restaurante (spec 040). */
final class AssistantPeriod
{
    private const TIMEZONE = 'America/Lima';

    /** @var array<int, string> */
    private const MONTHS = [1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr', 5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic'];

    /**
     * @return array{desde: CarbonImmutable, hasta: CarbonImmutable, periodo: string, agrupar: string, etiqueta: string}
     */
    public static function range(string $period, ?CarbonImmutable $now = null): array
    {
        $local = ($now ?? CarbonImmutable::now())->setTimezone(self::TIMEZONE);

        [$from, $to, $group] = match ($period) {
            'hoy' => [$local->startOfDay(), $local->endOfDay(), 'dia'],
            'ayer' => [$local->subDay()->startOfDay(), $local->subDay()->endOfDay(), 'dia'],
            'semana' => [$local->startOfWeek(CarbonInterface::MONDAY), $local->endOfWeek(CarbonInterface::SUNDAY), 'dia'],
            'semana_pasada' => [
                $local->startOfWeek(CarbonInterface::MONDAY)->subWeek(),
                $local->startOfWeek(CarbonInterface::MONDAY)->subWeek()->endOfWeek(CarbonInterface::SUNDAY),
                'dia',
            ],
            'mes' => [$local->startOfMonth(), $local->endOfMonth(), 'dia'],
            'mes_pasado' => [$local->startOfMonth()->subMonth(), $local->startOfMonth()->subMonth()->endOfMonth(), 'dia'],
            'anio' => [$local->startOfYear(), $local->endOfYear(), 'mes'],
            default => throw new \InvalidArgumentException('Período no válido.'),
        };

        return self::payload($from, $to, $period, $group);
    }

    /**
     * @param  array{desde: CarbonImmutable, hasta: CarbonImmutable, periodo: string, agrupar: string, etiqueta: string}  $range
     * @return array{desde: CarbonImmutable, hasta: CarbonImmutable, periodo: string, agrupar: string, etiqueta: string}
     */
    public static function previous(array $range, string $mode = 'anterior'): array
    {
        $from = $range['desde'];
        $to = $range['hasta'];

        if ($mode === 'anio_pasado') {
            $from = $from->subYear();
            $to = $to->subYear();
        } else {
            $days = (int) round($from->startOfDay()->diffInDays($to->startOfDay())) + 1;
            $to = $from->subDay()->endOfDay();
            $from = $to->subDays($days - 1)->startOfDay();
        }

        return self::payload($from, $to, $range['periodo'], $range['agrupar']);
    }

    /**
     * @return array{desde: CarbonImmutable, hasta: CarbonImmutable, periodo: string, agrupar: string, etiqueta: string}
     */
    private static function payload(CarbonImmutable $from, CarbonImmutable $to, string $period, string $group): array
    {
        return [
            'desde' => $from,
            'hasta' => $to,
            'periodo' => $period,
            'agrupar' => $group,
            'etiqueta' => self::label($from, $to, $period),
        ];
    }

    private static function label(CarbonImmutable $from, CarbonImmutable $to, string $period): string
    {
        return match ($period) {
            'hoy', 'ayer' => $from->format('d/m/Y'),
            'semana', 'semana_pasada' => $from->format('d/m').' – '.$to->format('d/m/Y'),
            'mes', 'mes_pasado' => self::MONTHS[(int) $from->format('n')].' '.$from->format('Y'),
            'anio' => $from->format('Y'),
            default => $from->format('d/m/Y').' – '.$to->format('d/m/Y'),
        };
    }

    public static function monthShort(int $month): string
    {
        return self::MONTHS[$month] ?? '';
    }
}
