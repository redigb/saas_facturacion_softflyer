<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Infrastructure\Persistence\DishPreparation;
use App\Modules\Restaurant\Infrastructure\Persistence\MenuAssignments;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/** Fichas descriptivas de preparación por estación (spec 031). */
final class ManagePreparations
{
    /** Catálogo de unidades de medida de los ingredientes (spec 038). */
    public const UNIDADES = ['ONZ', 'ML', 'GR', 'KG'];

    public function __construct(
        private readonly MenuAssignments $assignments,
        private readonly ManageKitchenAccess $access,
    ) {}

    /** @return list<array<string, mixed>> */
    public function list(User $user, int $branchId, int|string $station): array
    {
        $stationId = $station === 'general' ? null : (int) $station;
        $this->access->authorize($user, $branchId, $stationId);

        $products = Product::query()
            ->with(['category'])
            ->whereIn('tipo', ['PLATO', 'BEBIDA'])
            ->where('es_activo', true)
            ->orderBy('nombre')
            ->get();

        $ids = $products->modelKeys();
        $productStations = $this->assignments->productStations($ids);
        $categoryStations = $this->assignments->categoryStations($products->pluck('categoria_id')->filter()->unique()->values()->all());
        $preparations = DishPreparation::query()->with('ingredients')->whereIn('producto_id', $ids)->get()->keyBy('producto_id');

        return $products
            ->filter(fn (Product $product) => ($productStations[$product->id] ?? $categoryStations[$product->categoria_id] ?? null) === $stationId)
            ->map(fn (Product $product) => $this->summary($product, $preparations->get($product->id)))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public function show(User $user, int $branchId, Product $product): array
    {
        $stationId = $this->effectiveStation($product);
        $this->access->authorize($user, $branchId, $stationId);

        return $this->present($product, DishPreparation::with(['ingredients', 'updatedBy'])->where('producto_id', $product->id)->first(), $stationId);
    }

    /** @param list<array{nombre: string, cantidad?: string|null, unidad?: string|null}> $ingredients */
    public function save(User $user, int $branchId, Product $product, array $ingredients, ?string $procedure, ?string $notes): array
    {
        $stationId = $this->effectiveStation($product);
        $this->access->authorize($user, $branchId, $stationId);

        $preparation = DB::transaction(function () use ($user, $product, $ingredients, $procedure, $notes) {
            $preparation = DishPreparation::query()->firstOrNew(['producto_id' => $product->id]);
            $preparation->fill([
                'procedimiento' => $this->blankToNull($procedure),
                'notas' => $this->blankToNull($notes),
                'actualizado_por' => $user->id,
            ])->save();

            $preparation->ingredients()->delete();
            foreach (array_values($ingredients) as $order => $ingredient) {
                $preparation->ingredients()->create([
                    'nombre' => trim($ingredient['nombre']),
                    'cantidad' => $this->blankToNull(Arr::get($ingredient, 'cantidad')),
                    'unidad' => $this->blankToNull(Arr::get($ingredient, 'unidad')),
                    'orden' => $order,
                ]);
            }

            return $preparation->fresh(['ingredients', 'updatedBy']);
        });

        return $this->present($product, $preparation, $stationId);
    }

    private function effectiveStation(Product $product): ?int
    {
        abort_unless(in_array($product->tipo, ['PLATO', 'BEBIDA'], true) && $product->es_activo, 404);

        return $this->assignments->productStations([$product->id])[$product->id]
            ?? ($product->categoria_id ? ($this->assignments->categoryStations([$product->categoria_id])[$product->categoria_id] ?? null) : null);
    }

    /** @return array<string, mixed> */
    private function summary(Product $product, ?DishPreparation $preparation): array
    {
        return [
            'producto' => $this->product($product),
            'completa' => $preparation !== null
                && $preparation->ingredients->isNotEmpty()
                && filled($preparation->procedimiento),
            'actualizado_en' => $preparation?->actualizado_en?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function present(Product $product, ?DishPreparation $preparation, ?int $stationId): array
    {
        $station = $stationId === null ? null : PreparationStation::find($stationId);

        return [
            'producto' => $this->product($product),
            'estacion' => $station ? ['id' => $station->id, 'nombre' => $station->nombre] : ['id' => 'general', 'nombre' => 'General (sin estación)'],
            'ingredientes' => $preparation?->ingredients->map(fn ($ingredient) => [
                'nombre' => $ingredient->nombre,
                'cantidad' => $ingredient->cantidad,
                'unidad' => $ingredient->unidad,
            ])->values()->all() ?? [],
            'procedimiento' => $preparation?->procedimiento,
            'notas' => $preparation?->notas,
            'actualizado_por' => $preparation?->updatedBy?->nombre,
            'actualizado_en' => $preparation?->actualizado_en?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function product(Product $product): array
    {
        return [
            'id' => $product->id,
            'nombre' => $product->nombre,
            'tipo' => $product->tipo,
            'categoria' => $product->category?->nombre,
            'imagen_url' => $product->imagen_ruta ? Storage::disk('public')->url($product->imagen_ruta) : null,
        ];
    }

    private function blankToNull(?string $value): ?string
    {
        $value = $value === null ? null : trim($value);

        return $value === '' ? null : $value;
    }
}
