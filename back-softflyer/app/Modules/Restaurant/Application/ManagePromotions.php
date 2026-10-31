<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Persistence\Promotion;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Gestión de promociones de la carta (spec 039). */
final class ManagePromotions
{
    private const TIMEZONE = 'America/Lima';

    public function __construct(private readonly TenantContext $context) {}

    /** @return list<array<string, mixed>> */
    public function list(): array
    {
        $promotions = Promotion::query()->orderByDesc('es_activa')->orderByDesc('desde')->orderByDesc('id')->get();
        $products = $this->names('promocion_producto', 'producto_id', 'productos', $promotions->modelKeys());
        $categories = $this->names('promocion_categoria', 'categoria_id', 'categorias', $promotions->modelKeys());
        $now = CarbonImmutable::now();

        return $promotions->map(fn (Promotion $promotion) => $this->present(
            $promotion,
            $products[$promotion->id] ?? [],
            $categories[$promotion->id] ?? [],
            $now,
        ))->all();
    }

    /** @param array<string, mixed> $data */
    public function save(array $data, ?Promotion $promotion = null): array
    {
        $promotion ??= new Promotion;
        $productIds = $this->existing('productos', $data['producto_ids'] ?? []);
        $categoryIds = $this->existing('categorias', $data['categoria_ids'] ?? []);

        if ($productIds === [] && $categoryIds === []) {
            throw ValidationException::withMessages(['producto_ids' => ['Elige al menos un plato o una categoría.']]);
        }

        return DB::transaction(function () use ($promotion, $data, $productIds, $categoryIds) {
            $promotion->fill([
                'nombre' => trim($data['nombre']),
                'descripcion' => $this->blankToNull($data['descripcion'] ?? null),
                'tipo' => $data['tipo'],
                'valor' => $data['valor'],
                'desde' => $this->inPeru($data['desde']),
                'hasta' => $this->inPeru($data['hasta']),
                'dias_semana' => $data['dias_semana'] ?? [],
                'hora_inicio' => $this->blankToNull($data['hora_inicio'] ?? null),
                'hora_fin' => $this->blankToNull($data['hora_fin'] ?? null),
                'prioridad' => $data['prioridad'] ?? 0,
                'es_activa' => $data['es_activa'] ?? true,
            ])->save();

            $this->syncScope('promocion_producto', 'producto_id', $promotion, $productIds);
            $this->syncScope('promocion_categoria', 'categoria_id', $promotion, $categoryIds);

            return $this->present($promotion->fresh(), $this->scopeNames('productos', $productIds), $this->scopeNames('categorias', $categoryIds), CarbonImmutable::now());
        });
    }

    public function delete(Promotion $promotion): void
    {
        DB::transaction(function () use ($promotion) {
            DB::table('promocion_producto')->where('promocion_id', $promotion->id)->delete();
            DB::table('promocion_categoria')->where('promocion_id', $promotion->id)->delete();
            $promotion->delete();
        });
    }

    /**
     * @param  list<int>  $productIds
     * @param  list<int>  $categoryIds
     * @return array<string, mixed>
     */
    private function present(Promotion $promotion, array $products, array $categories, CarbonImmutable $now): array
    {
        [$state, $applies] = $this->state($promotion, $now);

        return [
            'id' => $promotion->id,
            'nombre' => $promotion->nombre,
            'descripcion' => $promotion->descripcion,
            'tipo' => $promotion->tipo,
            'valor' => $promotion->valor,
            'desde' => $promotion->desde->utc()->toIso8601ZuluString(),
            'hasta' => $promotion->hasta->utc()->toIso8601ZuluString(),
            'dias_semana' => array_map('intval', $promotion->dias_semana ?? []),
            'hora_inicio' => $promotion->hora_inicio,
            'hora_fin' => $promotion->hora_fin,
            'prioridad' => $promotion->prioridad,
            'es_activa' => $promotion->es_activa,
            'aplica_ahora' => $applies,
            'estado' => $state,
            'productos' => $products,
            'categorias' => $categories,
            'alcance' => match (true) {
                $products !== [] && $categories !== [] => 'MIXTO',
                $categories !== [] => 'CATEGORIAS',
                default => 'PRODUCTOS',
            },
        ];
    }

    /** @return array{0: string, 1: bool} */
    private function state(Promotion $promotion, CarbonImmutable $now): array
    {
        if (! $promotion->es_activa) {
            return ['INACTIVA', false];
        }
        if ($now->lt($promotion->desde)) {
            return ['PROGRAMADA', false];
        }
        if ($now->gt($promotion->hasta)) {
            return ['VENCIDA', false];
        }

        return $promotion->appliesAt($now) ? ['VIGENTE', true] : ['FUERA_DE_VENTANA', false];
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, list<array{id: int, nombre: string}>>
     */
    private function names(string $pivot, string $column, string $table, array $promotionIds): array
    {
        if ($promotionIds === []) {
            return [];
        }

        $rows = DB::table($pivot)->whereIn('promocion_id', $promotionIds)->get(['promocion_id', $column]);
        $names = DB::table($table)->whereIn('id', $rows->pluck($column)->unique()->all())->pluck('nombre', 'id');

        return $rows->groupBy('promocion_id')->map(fn ($items, $promotionId) => $items
            ->map(fn ($item) => ['id' => (int) $item->{$column}, 'nombre' => (string) ($names[$item->{$column}] ?? '—')])
            ->values()->all())->all();
    }

    /** @param list<int> $ids @return list<array{id: int, nombre: string}> */
    private function scopeNames(string $table, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table($table)->whereIn('id', $ids)->orderBy('nombre')->get(['id', 'nombre'])
            ->map(fn ($row) => ['id' => (int) $row->id, 'nombre' => (string) $row->nombre])->all();
    }

    /** @param list<int> $ids @return list<int> */
    private function existing(string $table, array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));

        return $ids === [] ? [] : DB::table($table)->whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /** @param list<int> $ids */
    private function syncScope(string $pivot, string $column, Promotion $promotion, array $ids): void
    {
        DB::table($pivot)->where('promocion_id', $promotion->id)->delete();

        foreach ($ids as $id) {
            DB::table($pivot)->insert([
                'inquilino_id' => $this->context->id(),
                'promocion_id' => $promotion->id,
                $column => $id,
            ]);
        }
    }

    private function inPeru(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, self::TIMEZONE)->utc();
    }

    private function blankToNull(?string $value): ?string
    {
        $value = $value === null ? null : trim($value);

        return $value === '' ? null : $value;
    }
}
