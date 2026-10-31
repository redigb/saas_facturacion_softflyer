<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Shared\Domain\Money;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Tablero de ventas del administrador (spec 039).
 * Solo cuenta ventas EMITIDAS; los límites y agrupaciones se calculan en hora de Perú.
 */
final class GetAnalytics
{
    private const TIMEZONE = 'America/Lima';

    private const MONTHS = [1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr', 5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic'];

    private const WEEKDAYS = [1 => 'Lun', 2 => 'Mar', 3 => 'Mié', 4 => 'Jue', 5 => 'Vie', 6 => 'Sáb', 7 => 'Dom'];

    /**
     * @param  array{desde?: ?string, hasta?: ?string, sucursal_id?: ?int, agrupar?: ?string}  $filters
     * @return array<string, mixed>
     */
    public function handle(User $user, array $filters): array
    {
        $branches = $user->branches();
        $from = $this->date($filters['desde'] ?? null) ?? CarbonImmutable::now(self::TIMEZONE)->startOfMonth();
        $to = $this->date($filters['hasta'] ?? null) ?? CarbonImmutable::now(self::TIMEZONE);

        if ($to->lt($from)) {
            [$from, $to] = [$to, $from];
        }
        $from = $from->startOfDay();
        $to = $to->endOfDay();

        $branchId = $filters['sucursal_id'] ?? null;
        $group = $filters['agrupar'] ?? $this->defaultGroup($from, $to);
        $start = $from->utc();
        $end = $to->utc();

        $current = $this->kpis($branchId, $start, $end);
        $previousRange = $this->previousRange($from, $to);
        $previous = $this->kpis($branchId, $previousRange[0]->utc(), $previousRange[1]->utc());

        return [
            'rango' => [
                'desde' => $from->toDateString(),
                'hasta' => $to->toDateString(),
                'agrupar' => $group,
                'comparacion' => ['desde' => $previousRange[0]->toDateString(), 'hasta' => $previousRange[1]->toDateString()],
            ],
            'kpis' => $current,
            'comparacion' => [
                'ventas_pct' => $this->percentChange($current['ventas_centavos'], $previous['ventas_centavos']),
                'ordenes_pct' => $this->percentChange($current['ordenes'], $previous['ordenes']),
                'ticket_pct' => $this->percentChange($current['ticket_centavos'], $previous['ticket_centavos']),
                'platos_pct' => $this->percentChange($current['platos'], $previous['platos']),
            ],
            'serie' => $this->series($branchId, $from, $to, $group),
            'por_anio' => $this->byYear($branchId, $start, $end),
            'top_platos' => $this->topDishes($branchId, $start, $end, $current['ventas_centavos']),
            'top_categorias' => $this->topCategories($branchId, $start, $end),
            'por_metodo' => $this->byPaymentMethod($branchId, $start, $end),
            'por_cobrador' => $this->byCashier($branchId, $start, $end),
            'por_sucursal' => $this->byBranch($branchId, $start, $end),
            'por_hora' => $this->byHour($branchId, $start, $end),
            'por_dia_semana' => $this->byWeekday($branchId, $start, $end),
            'anios' => $this->years($branchId),
            'sucursales' => $branches->map(fn ($branch) => ['id' => (int) $branch->id, 'nombre' => $branch->nombre])->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function kpis(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        $sales = $this->sales($branchId, $start, $end)
            ->selectRaw('COALESCE(SUM(total), 0) as ventas, COUNT(*) as ordenes, COALESCE(SUM(igv), 0) as igv, COALESCE(SUM(monto_propina), 0) as propinas')
            ->first();

        $salesCents = Money::cents($sales->ventas);
        $orders = (int) $sales->ordenes;
        $ticket = $orders > 0 ? intdiv($salesCents, $orders) : 0;

        $dishes = $this->salesLines($branchId, $start, $end)->sum('detalle_ventas.cantidad');

        return [
            'ventas' => Money::format($salesCents),
            'ventas_centavos' => $salesCents,
            'ordenes' => $orders,
            'ticket_promedio' => Money::format($ticket),
            'ticket_centavos' => $ticket,
            'platos' => (int) round((float) $dishes),
            'igv' => Money::format(Money::cents($sales->igv)),
            'propinas' => Money::format(Money::cents($sales->propinas)),
        ];
    }

    /** @return list<array{periodo: string, etiqueta: string, ventas: string, ordenes: int}> */
    private function series(?int $branchId, CarbonImmutable $from, CarbonImmutable $to, string $group): array
    {
        $expression = match ($group) {
            'anio' => "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY')",
            'mes' => "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY-MM')",
            default => "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY-MM-DD')",
        };

        $rows = $this->sales($branchId, $from->utc(), $to->utc())
            ->selectRaw("$expression as periodo, SUM(v.total) as ventas, COUNT(*) as ordenes")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->get()
            ->keyBy('periodo');

        return collect($this->periods($from, $to, $group))->map(fn (array $period) => [
            'periodo' => $period['periodo'],
            'etiqueta' => $period['etiqueta'],
            'ventas' => Money::format(Money::cents($rows[$period['periodo']]->ventas ?? 0)),
            'ordenes' => (int) ($rows[$period['periodo']]->ordenes ?? 0),
        ])->all();
    }

    /** @return list<array{anio: int, ventas: string, ordenes: int}> */
    private function byYear(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        $expression = "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY')";

        return $this->sales($branchId, $start, $end)
            ->selectRaw("$expression as anio, SUM(v.total) as ventas, COUNT(*) as ordenes")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->get()
            ->map(fn ($row) => [
                'anio' => (int) $row->anio,
                'ventas' => Money::format(Money::cents($row->ventas)),
                'ordenes' => (int) $row->ordenes,
            ])->all();
    }

    /** @return list<array<string, mixed>> */
    private function topDishes(?int $branchId, CarbonInterface $start, CarbonInterface $end, int $totalCents): array
    {
        return $this->salesLines($branchId, $start, $end)
            ->whereNotNull('detalle_ventas.producto_id')
            ->leftJoin('productos as p', 'p.id', '=', 'detalle_ventas.producto_id')
            ->groupBy('detalle_ventas.producto_id')
            ->selectRaw('detalle_ventas.producto_id, COALESCE(MAX(p.nombre), MAX(detalle_ventas.descripcion)) as nombre, SUM(detalle_ventas.cantidad) as cantidad, SUM(detalle_ventas.total) as ventas')
            ->orderByDesc('cantidad')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($totalCents) {
                $cents = Money::cents($row->ventas);

                return [
                    'producto_id' => (int) $row->producto_id,
                    'nombre' => $row->nombre,
                    'cantidad' => (string) round((float) $row->cantidad, 3),
                    'ventas' => Money::format($cents),
                    'participacion' => $totalCents > 0 ? round($cents / $totalCents * 100, 1) : 0.0,
                ];
            })->all();
    }

    /** @return list<array<string, mixed>> */
    private function topCategories(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->salesLines($branchId, $start, $end)
            ->leftJoin('productos as p', 'p.id', '=', 'detalle_ventas.producto_id')
            ->leftJoin('categorias as c', 'c.id', '=', 'p.categoria_id')
            ->groupBy('p.categoria_id')
            ->selectRaw('p.categoria_id, COALESCE(MAX(c.nombre), \'Sin categoría\') as nombre, SUM(detalle_ventas.cantidad) as cantidad, SUM(detalle_ventas.total) as ventas')
            ->orderByDesc('ventas')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'categoria_id' => $row->categoria_id === null ? null : (int) $row->categoria_id,
                'nombre' => $row->nombre,
                'cantidad' => (string) round((float) $row->cantidad, 3),
                'ventas' => Money::format(Money::cents($row->ventas)),
            ])->all();
    }

    /** @return list<array<string, mixed>> */
    private function byPaymentMethod(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->sales($branchId, $start, $end)
            ->join('pagos as pg', 'pg.venta_id', '=', 'v.id')
            ->join('metodos_pago as mp', 'mp.id', '=', 'pg.metodo_pago_id')
            ->groupBy('mp.id', 'mp.codigo', 'mp.nombre')
            ->selectRaw('mp.codigo, mp.nombre, SUM(pg.monto) as ventas, COUNT(DISTINCT v.id) as cantidad')
            ->orderByDesc('ventas')
            ->get()
            ->map(fn ($row) => [
                'codigo' => $row->codigo,
                'nombre' => $row->nombre,
                'ventas' => Money::format(Money::cents($row->ventas)),
                'cantidad' => (int) $row->cantidad,
            ])->all();
    }

    /** @return list<array<string, mixed>> */
    private function byCashier(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->sales($branchId, $start, $end)
            ->leftJoin('usuarios as u', 'u.id', '=', 'v.usuario_id')
            ->groupBy('v.usuario_id', 'u.nombre')
            ->selectRaw('v.usuario_id, COALESCE(MAX(u.nombre), \'Sin usuario\') as nombre, SUM(v.total) as ventas, COUNT(*) as ordenes')
            ->orderByDesc('ventas')
            ->get()
            ->map(fn ($row) => [
                'usuario_id' => (int) $row->usuario_id,
                'nombre' => $row->nombre,
                'ventas' => Money::format(Money::cents($row->ventas)),
                'ordenes' => (int) $row->ordenes,
            ])->all();
    }

    /** @return list<array<string, mixed>> */
    private function byBranch(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->sales($branchId, $start, $end)
            ->join('sucursales as s', 's.id', '=', 'v.sucursal_id')
            ->groupBy('v.sucursal_id', 's.nombre')
            ->selectRaw('v.sucursal_id, s.nombre, SUM(v.total) as ventas, COUNT(*) as ordenes')
            ->orderByDesc('ventas')
            ->get()
            ->map(fn ($row) => [
                'sucursal_id' => (int) $row->sucursal_id,
                'nombre' => $row->nombre,
                'ventas' => Money::format(Money::cents($row->ventas)),
                'ordenes' => (int) $row->ordenes,
            ])->all();
    }

    /** @return list<array{hora: string, ventas: string, ordenes: int}> */
    private function byHour(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        $expression = "EXTRACT(HOUR FROM v.creado_en AT TIME ZONE '".self::TIMEZONE."')";

        return $this->sales($branchId, $start, $end)
            ->selectRaw("$expression as hora, SUM(v.total) as ventas, COUNT(*) as ordenes")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->get()
            ->map(fn ($row) => [
                'hora' => str_pad((string) (int) $row->hora, 2, '0', STR_PAD_LEFT).':00',
                'ventas' => Money::format(Money::cents($row->ventas)),
                'ordenes' => (int) $row->ordenes,
            ])->all();
    }

    /** @return list<array{dia: int, etiqueta: string, ventas: string, ordenes: int}> */
    private function byWeekday(?int $branchId, CarbonInterface $start, CarbonInterface $end): array
    {
        $expression = "EXTRACT(ISODOW FROM v.creado_en AT TIME ZONE '".self::TIMEZONE."')";

        return $this->sales($branchId, $start, $end)
            ->selectRaw("$expression as dia, SUM(v.total) as ventas, COUNT(*) as ordenes")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->get()
            ->map(fn ($row) => [
                'dia' => (int) $row->dia,
                'etiqueta' => self::WEEKDAYS[(int) $row->dia] ?? '',
                'ventas' => Money::format(Money::cents($row->ventas)),
                'ordenes' => (int) $row->ordenes,
            ])->all();
    }

    /** @return list<int> */
    private function years(?int $branchId): array
    {
        $expression = "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY')";

        return $this->sales($branchId, CarbonImmutable::create(2000, 1, 1), CarbonImmutable::now()->addYear())
            ->selectRaw("$expression as anio")
            ->groupByRaw($expression)
            ->orderByRaw("$expression DESC")
            ->pluck('anio')
            ->map(fn ($year) => (int) $year)
            ->all();
    }

    private function sales(?int $branchId, CarbonInterface $start, CarbonInterface $end): Builder
    {
        return DB::table('ventas as v')
            ->where('v.estado', 'EMITIDA')
            ->whereBetween('v.creado_en', [$start, $end])
            ->when($branchId !== null, fn (Builder $query) => $query->where('v.sucursal_id', $branchId));
    }

    private function salesLines(?int $branchId, CarbonInterface $start, CarbonInterface $end): Builder
    {
        return DB::table('detalle_ventas')
            ->join('ventas as v', 'v.id', '=', 'detalle_ventas.venta_id')
            ->where('v.estado', 'EMITIDA')
            ->whereBetween('v.creado_en', [$start, $end])
            ->when($branchId !== null, fn (Builder $query) => $query->where('v.sucursal_id', $branchId));
    }

    /** @return list<array{periodo: string, etiqueta: string}> */
    private function periods(CarbonImmutable $from, CarbonImmutable $to, string $group): array
    {
        $periods = [];
        $cursor = match ($group) {
            'anio' => $from->startOfYear(),
            'mes' => $from->startOfMonth(),
            default => $from->startOfDay(),
        };
        $guard = 0;

        while ($cursor->lte($to) && $guard++ < 2000) {
            $periods[] = match ($group) {
                'anio' => ['periodo' => $cursor->format('Y'), 'etiqueta' => $cursor->format('Y')],
                'mes' => ['periodo' => $cursor->format('Y-m'), 'etiqueta' => self::MONTHS[(int) $cursor->format('n')].' '.$cursor->format('Y')],
                default => ['periodo' => $cursor->format('Y-m-d'), 'etiqueta' => $cursor->format('d/m')],
            };

            $cursor = match ($group) {
                'anio' => $cursor->addYear(),
                'mes' => $cursor->addMonth(),
                default => $cursor->addDay(),
            };
        }

        return $periods;
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function previousRange(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $days = (int) round($from->startOfDay()->diffInDays($to->startOfDay())) + 1;
        $previousTo = $from->subDay()->endOfDay();
        $previousFrom = $previousTo->subDays($days - 1)->startOfDay();

        return [$previousFrom, $previousTo];
    }

    private function defaultGroup(CarbonImmutable $from, CarbonImmutable $to): string
    {
        $days = (int) round($from->startOfDay()->diffInDays($to->startOfDay()));

        return $days <= 62 ? 'dia' : ($days <= 730 ? 'mes' : 'anio');
    }

    private function percentChange(int|float $current, int|float $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return (float) $current === 0.0 ? 0.0 : null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function date(?string $value): ?CarbonImmutable
    {
        return $value === null || $value === '' ? null : CarbonImmutable::parse($value, self::TIMEZONE);
    }
}
