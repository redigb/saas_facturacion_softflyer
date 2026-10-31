<?php

namespace App\Modules\Assistant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Shared\Domain\Money;
use App\Shared\Exceptions\BusinessException;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Catálogo cerrado de acciones del asistente (spec 040).
 * Solo lectura, argumentos por enums y siempre limitado a las sucursales/almacenes del usuario.
 */
final class AssistantActions
{
    public const SALES_PERMISSION = 'reportes.ventas';

    public const STOCK_PERMISSION = 'inventario.ver';

    public const STOCK_ADMIN = 'inventario.administrar';

    private const TIMEZONE = 'America/Lima';

    /** @return list<array<string, mixed>> */
    public function declarations(User $user): array
    {
        $tools = [];

        if ($user->hasPermission(self::SALES_PERMISSION)) {
            $period = ['type' => 'string', 'enum' => ['hoy', 'ayer', 'semana', 'semana_pasada', 'mes', 'mes_pasado', 'anio'], 'description' => 'Período a consultar.'];
            $branch = ['type' => 'integer', 'description' => 'Id de sucursal (opcional). Si falta, suma todas las sucursales del usuario.'];

            $tools[] = $this->tool('consultar_ventas', 'Ventas totales y ticket promedio de un período.', [
                'periodo' => $period,
                'sucursal_id' => $branch,
            ], ['periodo']);

            $tools[] = $this->tool('comparar_ventas', 'Compara las ventas de un período con el período anterior o con el año pasado.', [
                'periodo' => ['type' => 'string', 'enum' => ['hoy', 'ayer', 'semana', 'mes', 'anio'], 'description' => 'Período actual.'],
                'comparar_con' => ['type' => 'string', 'enum' => ['anterior', 'anio_pasado'], 'description' => 'Contra qué se compara.'],
                'sucursal_id' => $branch,
            ], ['periodo', 'comparar_con']);

            $tools[] = $this->tool('productos_mas_vendidos', 'Ranking de platos o bebidas más vendidos en un período.', [
                'periodo' => $period,
                'limite' => ['type' => 'integer', 'description' => 'Cuántos productos devolver (1 a 10).'],
                'metrica' => ['type' => 'string', 'enum' => ['unidades', 'importe'], 'description' => 'Ordenar por unidades o por importe vendido.'],
                'sucursal_id' => $branch,
            ], ['periodo']);

            $tools[] = $this->tool('ventas_por_hora', 'Horas del día con más ventas en un período.', [
                'periodo' => $period,
                'sucursal_id' => $branch,
            ], ['periodo']);

            $tools[] = $this->tool('rendimiento_meseros', 'Ranking de meseros por ventas atribuidas a sus pedidos en un período.', [
                'periodo' => $period,
                'sucursal_id' => $branch,
            ], ['periodo']);

            $tools[] = $this->tool('recomendaciones', 'Consejos operativos para el restaurante basados en ventas, platos más vendidos, horas punta y stock bajo. Úsalo cuando pregunten qué hacer o qué se recomienda.', [
                'periodo' => $period,
                'sucursal_id' => $branch,
            ], []);

            if ($user->hasPermission(self::STOCK_PERMISSION) || $user->hasPermission(self::STOCK_ADMIN)) {
                $tools[] = $this->tool('consultar_stock_bajo', 'Productos cuya cantidad está en o por debajo del stock mínimo.', [
                    'sucursal_id' => $branch,
                    'limite' => ['type' => 'integer', 'description' => 'Cuántos productos devolver (1 a 20).'],
                ], []);

                $tools[] = $this->tool('resumen_stock', 'Resumen del inventario: cuántos artículos están bajo el mínimo, sobre el mínimo o sin mínimo definido.', [
                    'sucursal_id' => $branch,
                ], []);
            }
        }

        return $tools;
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array<string, mixed>
     */
    public function run(User $user, string $name, array $arguments): array
    {
        $allowed = array_column($this->declarations($user), 'name');

        if (! in_array($name, $allowed, true)) {
            throw new BusinessException('ASISTENTE_ACCION_INVALIDA', 'El asistente pidió una acción no permitida.', 422);
        }

        $arguments = $this->validate($name, $arguments);

        return match ($name) {
            'consultar_ventas' => $this->sales($user, $arguments),
            'comparar_ventas' => $this->comparison($user, $arguments),
            'productos_mas_vendidos' => $this->topDishes($user, $arguments),
            'ventas_por_hora' => $this->peakHours($user, $arguments),
            'rendimiento_meseros' => $this->waiterPerformance($user, $arguments),
            'recomendaciones' => $this->recommendations($user, $arguments),
            'consultar_stock_bajo' => $this->lowStock($user, $arguments),
            'resumen_stock' => $this->stockSummary($user, $arguments),
        };
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function sales(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo']);
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $totals = $this->totals($branches, $range);
        $dishes = $this->dishes($branches, $range);

        if ($totals['ordenes'] === 0) {
            return $this->payload($range, 'consultar_ventas', "No hay ventas registradas en {$range['etiqueta']}.", [
                'tipo' => 'metric',
                'titulo' => 'Ventas del período',
                'moneda' => 'PEN',
                'valor' => '0.00',
            ]);
        }

        $answer = "En {$range['etiqueta']} vendiste S/ {$totals['ventas']} en {$totals['ordenes']} cuentas"
            ." (ticket promedio S/ {$totals['ticket']})."
            .($dishes > 0 ? " Se vendieron {$dishes} platos." : '');

        $visualization = in_array($arguments['periodo'], ['hoy', 'ayer'], true)
            ? ['tipo' => 'metric', 'titulo' => 'Ventas de '.($arguments['periodo'] === 'hoy' ? 'hoy' : 'ayer'), 'moneda' => 'PEN', 'valor' => $totals['ventas']]
            : ['tipo' => 'barras', 'titulo' => 'Ventas por '.($range['agrupar'] === 'mes' ? 'mes' : 'día'), 'moneda' => 'PEN', 'puntos' => $this->series($branches, $range)];

        return $this->payload($range, 'consultar_ventas', $answer, $visualization);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function comparison(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo']);
        $previous = AssistantPeriod::previous($range, $arguments['comparar_con']);
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $current = $this->totals($branches, $range);
        $before = $this->totals($branches, $previous);
        $change = $this->percentChange($current['cents'], $before['cents']);

        $answer = "En {$range['etiqueta']} vendiste S/ {$current['ventas']}; en {$previous['etiqueta']} fueron S/ {$before['ventas']}."
            .($change === null ? ' No hay base suficiente para calcular la variación.' : ' La variación es '.($change >= 0 ? '+' : '').$change.'%.');

        return $this->payload($range, 'comparar_ventas', $answer, [
            'tipo' => 'comparacion',
            'titulo' => 'Ventas: actual vs. comparación',
            'actual' => ['etiqueta' => $range['etiqueta'], 'valor' => $current['ventas']],
            'anterior' => ['etiqueta' => $previous['etiqueta'], 'valor' => $before['ventas']],
            'variacion_pct' => $change,
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function topDishes(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo']);
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $limit = (int) ($arguments['limite'] ?? 5);
        $metric = $arguments['metrica'] ?? 'unidades';

        $rows = $this->dishesQuery($branches, $range)
            ->leftJoin('productos as p', 'p.id', '=', 'dv.producto_id')
            ->groupBy('dv.producto_id')
            ->selectRaw('dv.producto_id, COALESCE(MAX(p.nombre), MAX(dv.descripcion)) as nombre, SUM(dv.cantidad) as cantidad, SUM(dv.total) as ventas')
            ->orderByRaw($metric === 'importe' ? 'SUM(dv.total) DESC' : 'SUM(dv.cantidad) DESC')
            ->limit($limit)
            ->get();

        if ($rows->isEmpty()) {
            return $this->payload($range, 'productos_mas_vendidos', "No hay platos vendidos en {$range['etiqueta']}.", [
                'tipo' => 'lista',
                'titulo' => 'Productos más vendidos',
                'items' => [],
            ]);
        }

        $items = $rows->values()->map(function ($row, int $index) {
            $quantity = $this->quantity($row->cantidad);

            return [
                'titulo' => ($index + 1).'. '.$row->nombre,
                'detalle' => "{$quantity} un. · S/ ".Money::format(Money::cents($row->ventas)),
            ];
        })->all();

        $answer = "Tus {$rows->count()} productos más vendidos de {$range['etiqueta']} por "
            .($metric === 'importe' ? 'importe' : 'unidades').":\n"
            .implode("\n", array_map(fn (array $item) => "{$item['titulo']} — {$item['detalle']}", $items));

        return $this->payload($range, 'productos_mas_vendidos', $answer, [
            'tipo' => 'lista',
            'titulo' => 'Productos más vendidos · '.$range['etiqueta'],
            'items' => $items,
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function lowStock(User $user, array $arguments): array
    {
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $rows = $this->lowStockRows($user, $branches, (int) ($arguments['limite'] ?? 10));

        if ($rows->isEmpty()) {
            return $this->payload(null, 'consultar_stock_bajo', 'No hay productos por debajo del stock mínimo en tus almacenes.', [
                'tipo' => 'lista',
                'titulo' => 'Stock bajo',
                'items' => [],
            ]);
        }

        $items = $rows->map(fn ($row) => $this->stockItem($row))->all();
        $answer = 'Hay '.$rows->count()." productos bajo el stock mínimo:\n"
            .implode("\n", array_map(fn (array $item) => "— {$item['titulo']}: {$item['detalle']}", $items));

        return $this->payload(null, 'consultar_stock_bajo', $answer, [
            'tipo' => 'lista',
            'titulo' => 'Productos con stock bajo',
            'items' => $items,
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function peakHours(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo']);
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $rows = $this->peakHourRows($branches, $range);

        if ($rows->isEmpty()) {
            return $this->payload($range, 'ventas_por_hora', "No hay ventas registradas en {$range['etiqueta']}.", [
                'tipo' => 'barras',
                'titulo' => 'Ventas por hora',
                'moneda' => 'PEN',
                'puntos' => [],
            ]);
        }

        $top = $rows->sortByDesc(fn ($row) => Money::cents($row->ventas))->take(3)->values();
        $answer = "Tus horas punta en {$range['etiqueta']} son: "
            .$top->map(fn ($row) => $this->hourLabel((int) $row->hora).' (S/ '.Money::format(Money::cents($row->ventas)).", {$row->ordenes} cuentas)")->implode(', ').'.';

        return $this->payload($range, 'ventas_por_hora', $answer, [
            'tipo' => 'barras',
            'titulo' => 'Ventas por hora · '.$range['etiqueta'],
            'moneda' => 'PEN',
            'puntos' => $rows->map(fn ($row) => [
                'etiqueta' => $this->hourLabel((int) $row->hora),
                'valor' => Money::format(Money::cents($row->ventas)),
            ])->values()->all(),
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function waiterPerformance(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo']);
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $extras = DB::table('detalle_pedido_modificador')
            ->select('detalle_pedido_id', DB::raw('SUM(precio_adicional) as extra'))
            ->groupBy('detalle_pedido_id');

        $rows = DB::table('venta_detalle_pedido as vdp')
            ->join('detalle_pedidos as dp', 'dp.id', '=', 'vdp.detalle_pedido_id')
            ->join('pedidos as p', 'p.id', '=', 'dp.pedido_id')
            ->join('ventas as v', 'v.id', '=', 'vdp.venta_id')
            ->join('usuarios as u', 'u.id', '=', 'p.mozo_id')
            ->leftJoinSub($extras, 'm', 'm.detalle_pedido_id', '=', 'dp.id')
            ->where('v.estado', 'EMITIDA')
            ->whereIn('v.sucursal_id', $branches)
            ->whereBetween('v.creado_en', [$range['desde']->utc(), $range['hasta']->utc()])
            ->groupBy('p.mozo_id')
            ->selectRaw('p.mozo_id, MAX(u.nombre) as nombre, SUM(dp.cantidad * (dp.precio_unitario + COALESCE(m.extra, 0))) as ventas, COUNT(DISTINCT p.id) as pedidos, SUM(dp.cantidad) as platos')
            ->orderByDesc('ventas')
            ->limit(10)
            ->get();

        if ($rows->isEmpty()) {
            return $this->payload($range, 'rendimiento_meseros', "No hay ventas atribuidas a meseros en {$range['etiqueta']}.", [
                'tipo' => 'lista',
                'titulo' => 'Rendimiento de meseros',
                'items' => [],
            ]);
        }

        $items = $rows->values()->map(fn ($row, int $index) => [
            'titulo' => ($index + 1).'. '.$row->nombre,
            'detalle' => 'S/ '.Money::format(Money::cents($row->ventas)).' · '.$row->pedidos.' pedidos · '.$this->quantity($row->platos).' platos',
        ])->all();

        $answer = "Tus meseros en {$range['etiqueta']}:\n"
            .implode("\n", array_map(fn (array $item) => "— {$item['titulo']}: {$item['detalle']}", $items));

        return $this->payload($range, 'rendimiento_meseros', $answer, [
            'tipo' => 'lista',
            'titulo' => 'Rendimiento de meseros · '.$range['etiqueta'],
            'items' => $items,
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function stockSummary(User $user, array $arguments): array
    {
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);

        $base = DB::table('existencias as e')
            ->join('almacenes as a', 'a.id', '=', 'e.almacen_id')
            ->join('productos as p', 'p.id', '=', 'e.producto_id')
            ->whereIn('a.sucursal_id', $branches)
            ->where('a.es_activo', true)
            ->where('p.controla_stock', true)
            ->where('p.es_activo', true);

        if (! $user->hasPermission(self::STOCK_ADMIN)) {
            $this->restrictToAssignedWarehouses($base, $user);
        }

        $totals = (clone $base)
            ->selectRaw('COUNT(*) as total,
                SUM(CASE WHEN e.stock_minimo > 0 AND e.cantidad <= e.stock_minimo THEN 1 ELSE 0 END) as bajo,
                SUM(CASE WHEN e.stock_minimo > 0 AND e.cantidad > e.stock_minimo THEN 1 ELSE 0 END) as sobre,
                SUM(CASE WHEN e.stock_minimo = 0 THEN 1 ELSE 0 END) as sin_minimo')
            ->first();

        $total = (int) $totals->total;
        if ($total === 0) {
            return $this->payload(null, 'resumen_stock', 'No hay artículos de inventario en tus almacenes.', [
                'tipo' => 'lista',
                'titulo' => 'Estado del inventario',
                'items' => [],
            ]);
        }

        $low = $this->lowStockRows($user, $branches, 5);
        $items = [
            ['titulo' => 'Bajo mínimo', 'detalle' => (int) $totals->bajo.' artículos'],
            ['titulo' => 'Sobre el mínimo', 'detalle' => (int) $totals->sobre.' artículos'],
        ];

        if ((int) $totals->sin_minimo > 0) {
            $items[] = ['titulo' => 'Sin mínimo definido', 'detalle' => (int) $totals->sin_minimo.' artículos'];
        }

        foreach ($low as $row) {
            $items[] = $this->stockItem($row);
        }

        $answer = "En tus almacenes hay {$total} artículos: ".(int) $totals->bajo.' bajo mínimo, '.(int) $totals->sobre.' por encima del mínimo'
            .((int) $totals->sin_minimo > 0 ? ' y '.(int) $totals->sin_minimo.' sin mínimo definido' : '').'.'
            .($low->isEmpty() ? ' No hay productos críticos por reponer.' : ' Los más críticos: '.$low->pluck('nombre')->implode(', ').'.');

        return $this->payload(null, 'resumen_stock', $answer, [
            'tipo' => 'lista',
            'titulo' => 'Estado del inventario',
            'items' => $items,
        ]);
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function recommendations(User $user, array $arguments): array
    {
        $range = AssistantPeriod::range($arguments['periodo'] ?? 'semana');
        $branches = $this->branches($user, $arguments['sucursal_id'] ?? null);
        $current = $this->totals($branches, $range);

        if ($current['ordenes'] === 0) {
            return $this->recommendationPayload($range, [[
                'titulo' => 'Aún no hay ventas',
                'detalle' => "No veo ventas en {$range['etiqueta']}. Registra las ventas del día para poder comparar y recomendarte.",
            ]]);
        }

        $before = $this->totals($branches, AssistantPeriod::previous($range, 'anterior'));
        $change = $this->percentChange($current['cents'], $before['cents']);
        $items = [];

        $items[] = match (true) {
            $change === null => [
                'titulo' => 'Aún sin comparación',
                'detalle' => 'No hay ventas en el período anterior; en unos días podré decirte si mejoras o empeoras.',
            ],
            $change <= -10 => [
                'titulo' => 'Recupera ventas',
                'detalle' => 'Las ventas bajaron '.abs($change)." % frente al período anterior. Prueba una promoción en tus horas más flojas o vuelve a empujar tus platos top.",
            ],
            $change >= 10 => [
                'titulo' => 'Aprovecha el impulso',
                'detalle' => 'Las ventas subieron '.$change.' % frente al período anterior. Asegura insumos de tus platos estrella y refuerza personal en hora punta.',
            ],
            default => [
                'titulo' => 'Ventas estables',
                'detalle' => 'Las ventas se mantienen ('.$change.' % de variación). Es buen momento para probar una promoción y mover la demanda.',
            ],
        };

        $top = $this->dishesQuery($branches, $range)
            ->leftJoin('productos as p', 'p.id', '=', 'dv.producto_id')
            ->groupBy('dv.producto_id')
            ->selectRaw('COALESCE(MAX(p.nombre), MAX(dv.descripcion)) as nombre, SUM(dv.cantidad) as cantidad, SUM(dv.total) as ventas')
            ->orderByRaw('SUM(dv.cantidad) DESC')
            ->limit(1)
            ->first();

        if ($top !== null) {
            $items[] = [
                'titulo' => 'Tu plato estrella',
                'detalle' => $top->nombre.' fue el más vendido ('.$this->quantity($top->cantidad).' un. · S/ '.Money::format(Money::cents($top->ventas)).'). Asegúrate de tener sus insumos disponibles.',
            ];
        }

        $peak = $this->peakHourRows($branches, $range)->sortByDesc(fn ($row) => Money::cents($row->ventas))->first();
        if ($peak !== null) {
            $items[] = [
                'titulo' => 'Refuerza la hora punta',
                'detalle' => 'La mayor venta entra a las '.$this->hourLabel((int) $peak->hora).' (S/ '.Money::format(Money::cents($peak->ventas)).'). Prepara caja y personal antes de esa hora.',
            ];
        }

        if ($user->hasPermission(self::STOCK_PERMISSION) || $user->hasPermission(self::STOCK_ADMIN)) {
            $low = $this->lowStockRows($user, $branches, 5);

            $items[] = $low->isEmpty()
                ? ['titulo' => 'Stock saludable', 'detalle' => 'No hay productos por debajo del stock mínimo en tus almacenes.']
                : ['titulo' => 'Repón stock', 'detalle' => 'Productos bajo mínimo: '.$low->pluck('nombre')->implode(', ').'.'];
        }

        return $this->recommendationPayload($range, $items);
    }

    /** @param list<array{titulo: string, detalle: string}> $items @return array<string, mixed> */
    private function recommendationPayload(array $range, array $items): array
    {
        $answer = "Esto es lo que veo en {$range['etiqueta']}:\n"
            .implode("\n", array_map(fn (array $item) => "— {$item['titulo']}: {$item['detalle']}", $items));

        return $this->payload($range, 'recomendaciones', $answer, [
            'tipo' => 'lista',
            'titulo' => 'Recomendaciones · '.$range['etiqueta'],
            'items' => $items,
        ]);
    }

    /** @return \Illuminate\Support\Collection<int, object> */
    private function peakHourRows(array $branches, array $range): \Illuminate\Support\Collection
    {
        $expression = "EXTRACT(HOUR FROM v.creado_en AT TIME ZONE '".self::TIMEZONE."')";

        return $this->salesQuery($branches, $range)
            ->selectRaw("$expression as hora, SUM(v.total) as ventas, COUNT(*) as ordenes")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->get();
    }

    /** @return \Illuminate\Support\Collection<int, object> */
    private function lowStockRows(User $user, array $branches, int $limit): \Illuminate\Support\Collection
    {
        $query = DB::table('existencias as e')
            ->join('almacenes as a', 'a.id', '=', 'e.almacen_id')
            ->join('productos as p', 'p.id', '=', 'e.producto_id')
            ->leftJoin('unidades_medida as u', 'u.id', '=', 'p.unidad_medida_id')
            ->whereIn('a.sucursal_id', $branches)
            ->where('a.es_activo', true)
            ->where('p.controla_stock', true)
            ->where('p.es_activo', true)
            ->where('e.stock_minimo', '>', 0)
            ->whereColumn('e.cantidad', '<=', 'e.stock_minimo');

        if (! $user->hasPermission(self::STOCK_ADMIN)) {
            $this->restrictToAssignedWarehouses($query, $user);
        }

        return $query
            ->orderBy('e.cantidad')
            ->limit($limit)
            ->select('p.nombre as nombre', 'a.nombre as almacen', 'e.cantidad', 'e.stock_minimo', 'u.nombre as unidad')
            ->get();
    }

    /** @return array{titulo: string, detalle: string} */
    private function stockItem(object $row): array
    {
        $unit = $row->unidad ?? 'unidades';

        return [
            'titulo' => $row->nombre,
            'detalle' => 'Quedan '.$this->quantity($row->cantidad)." {$unit} · mínimo ".$this->quantity($row->stock_minimo)." · {$row->almacen}",
        ];
    }

    private function hourLabel(int $hour): string
    {
        return str_pad((string) $hour, 2, '0', STR_PAD_LEFT).':00';
    }

    /** @return array{ventas: string, cents: int, ordenes: int, ticket: string} */
    private function totals(array $branches, array $range): array
    {
        $row = $this->salesQuery($branches, $range)
            ->selectRaw('COALESCE(SUM(v.total), 0) as ventas, COUNT(*) as ordenes')
            ->first();

        $cents = Money::cents($row->ventas);
        $orders = (int) $row->ordenes;

        return [
            'ventas' => Money::format($cents),
            'cents' => $cents,
            'ordenes' => $orders,
            'ticket' => Money::format($orders > 0 ? intdiv($cents, $orders) : 0),
        ];
    }

    private function dishes(array $branches, array $range): int
    {
        return (int) round((float) $this->dishesQuery($branches, $range)->sum('dv.cantidad'));
    }

    /** @return list<array{etiqueta: string, valor: string}> */
    private function series(array $branches, array $range): array
    {
        $group = $range['agrupar'];
        $expression = $group === 'mes'
            ? "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY-MM')"
            : "to_char(v.creado_en AT TIME ZONE '".self::TIMEZONE."', 'YYYY-MM-DD')";

        $rows = $this->salesQuery($branches, $range)
            ->selectRaw("$expression as periodo, SUM(v.total) as ventas")
            ->groupByRaw($expression)
            ->get()
            ->mapWithKeys(fn ($row) => [(string) $row->periodo => $row->ventas]);

        $cursor = $group === 'mes' ? $range['desde']->startOfMonth() : $range['desde']->startOfDay();
        $points = [];
        $guard = 0;

        while ($cursor->lte($range['hasta']) && $guard++ < 400) {
            $key = $group === 'mes' ? $cursor->format('Y-m') : $cursor->format('Y-m-d');
            $label = $group === 'mes'
                ? AssistantPeriod::monthShort((int) $cursor->format('n')).' '.$cursor->format('Y')
                : $cursor->format('d/m');

            $points[] = ['etiqueta' => $label, 'valor' => Money::format(Money::cents($rows[$key] ?? 0))];
            $cursor = $group === 'mes' ? $cursor->addMonth() : $cursor->addDay();
        }

        return $points;
    }

    private function salesQuery(array $branches, array $range): Builder
    {
        return DB::table('ventas as v')
            ->where('v.estado', 'EMITIDA')
            ->whereIn('v.sucursal_id', $branches)
            ->whereBetween('v.creado_en', [$range['desde']->utc(), $range['hasta']->utc()]);
    }

    private function dishesQuery(array $branches, array $range): Builder
    {
        return DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'v.id', '=', 'dv.venta_id')
            ->where('v.estado', 'EMITIDA')
            ->whereIn('v.sucursal_id', $branches)
            ->whereBetween('v.creado_en', [$range['desde']->utc(), $range['hasta']->utc()]);
    }

    /** @return list<int> */
    private function branches(User $user, ?int $requested): array
    {
        $ids = $user->branches()->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($requested === null) {
            return $ids;
        }
        if (! in_array($requested, $ids, true)) {
            throw new BusinessException('ASISTENTE_SUCURSAL_INVALIDA', 'Esa sucursal no está disponible para tu usuario.', 422);
        }

        return [$requested];
    }

    private function restrictToAssignedWarehouses(Builder $query, User $user): void
    {
        $assigned = DB::table('usuario_estacion_preparacion')->where('usuario_id', $user->id)->pluck('estacion_preparacion_id');
        $stationIds = $assigned->filter()->map(fn ($id) => (int) $id)->all();
        $seesGeneral = $assigned->contains(null);

        $query->where(function (Builder $scope) use ($stationIds, $seesGeneral) {
            if ($stationIds !== []) {
                $scope->whereIn('a.estacion_preparacion_id', $stationIds);
            }
            if ($seesGeneral) {
                $stationIds !== []
                    ? $scope->orWhereNull('a.estacion_preparacion_id')
                    : $scope->whereNull('a.estacion_preparacion_id');
            }
            if ($stationIds === [] && ! $seesGeneral) {
                $scope->whereRaw('1 = 0');
            }
        });
    }

    /** @param array<string, mixed> $arguments @return array<string, mixed> */
    private function validate(string $name, array $arguments): array
    {
        $rules = match ($name) {
            'consultar_ventas' => [
                'periodo' => ['required', 'string', 'in:hoy,ayer,semana,semana_pasada,mes,mes_pasado,anio'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'comparar_ventas' => [
                'periodo' => ['required', 'string', 'in:hoy,ayer,semana,mes,anio'],
                'comparar_con' => ['required', 'string', 'in:anterior,anio_pasado'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'productos_mas_vendidos' => [
                'periodo' => ['required', 'string', 'in:hoy,ayer,semana,semana_pasada,mes,mes_pasado,anio'],
                'limite' => ['nullable', 'integer', 'between:1,10'],
                'metrica' => ['nullable', 'string', 'in:unidades,importe'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'ventas_por_hora' => [
                'periodo' => ['required', 'string', 'in:hoy,ayer,semana,semana_pasada,mes,mes_pasado,anio'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'rendimiento_meseros' => [
                'periodo' => ['required', 'string', 'in:hoy,ayer,semana,semana_pasada,mes,mes_pasado,anio'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'recomendaciones' => [
                'periodo' => ['nullable', 'string', 'in:hoy,ayer,semana,semana_pasada,mes,mes_pasado,anio'],
                'sucursal_id' => ['nullable', 'integer'],
            ],
            'consultar_stock_bajo' => [
                'sucursal_id' => ['nullable', 'integer'],
                'limite' => ['nullable', 'integer', 'between:1,20'],
            ],
            'resumen_stock' => [
                'sucursal_id' => ['nullable', 'integer'],
            ],
        };

        if (array_diff(array_keys($arguments), array_keys($rules)) !== []) {
            throw new BusinessException('ASISTENTE_ARGUMENTOS_INVALIDOS', 'La consulta del asistente no es válida.', 422);
        }

        $validator = Validator::make($arguments, $rules);

        if ($validator->fails()) {
            throw new BusinessException('ASISTENTE_ARGUMENTOS_INVALIDOS', 'La consulta del asistente no es válida.', 422);
        }

        return $validator->validated();
    }

    /** @param list<array<string, mixed>> $required */
    private function tool(string $name, string $description, array $properties, array $required): array
    {
        return [
            'type' => 'function',
            'name' => $name,
            'description' => $description,
            'parameters' => [
                'type' => 'object',
                'properties' => $properties,
                'required' => $required,
            ],
        ];
    }

    /** @param array<string, mixed>|null $visualization @return array<string, mixed> */
    private function payload(?array $range, string $action, string $answer, ?array $visualization): array
    {
        return [
            'respuesta' => $answer,
            'accion' => $action,
            'periodo' => $range === null ? null : [
                'desde' => $range['desde']->toDateString(),
                'hasta' => $range['hasta']->toDateString(),
                'etiqueta' => $range['etiqueta'],
            ],
            'visualizacion' => $visualization,
            'sugerencias' => $this->suggestions(),
        ];
    }

    /** @return list<string> */
    private function suggestions(): array
    {
        return [
            '¿Cuánto vendí ayer?',
            '¿Cuáles son mis horas punta?',
            '¿Cómo van mis meseros?',
            '¿Cómo está mi inventario?',
            '¿Qué me recomiendas?',
            'Productos más vendidos de este mes',
        ];
    }

    private function percentChange(int $current, int $previous): ?float
    {
        if ($previous === 0) {
            return $current === 0 ? 0.0 : null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function quantity(mixed $value): string
    {
        $number = round((float) $value, 3);

        return rtrim(rtrim(number_format($number, 3, '.', ''), '0'), '.');
    }
}
