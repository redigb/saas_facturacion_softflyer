<?php

namespace App\Modules\Restaurant\Presentation;

use App\Core\Inventory\Infrastructure\Persistence\Category;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Infrastructure\Persistence\MenuAssignments;
use App\Modules\Restaurant\Infrastructure\Persistence\Modifier;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Forma exacta del contrato de la spec 002 (specs/002-carta/backend.md). Las estaciones y
 * los modificadores vienen de tablas del modulo, por eso no se usan Resources por modelo.
 */
final class MenuPresenter
{
    public function __construct(private readonly MenuAssignments $assignments) {}

    /** @param Collection<int, Category> $categories */
    public function categories(Collection $categories): array
    {
        $stations = $this->assignments->categoryStations($categories->modelKeys());

        return $categories->map(fn (Category $category) => [
            'id' => $category->id,
            'nombre' => $category->nombre,
            'color' => $category->color,
            'orden' => $category->orden,
            'es_activa' => $category->es_activa,
            'estacion_preparacion_id' => $stations[$category->id] ?? null,
            'productos_count' => (int) ($category->products_count ?? $category->products()->count()),
        ])->all();
    }

    public function category(Category $category): array
    {
        return $this->categories(new Collection([$category]))[0];
    }

    /** @param Collection<int, Product> $products */
    public function products(Collection $products): array
    {
        $products->loadMissing(['unit', 'igvAffectation']);
        $ids = $products->modelKeys();
        $productStations = $this->assignments->productStations($ids);
        $categoryStations = $this->assignments->categoryStations($products->pluck('categoria_id')->filter()->unique()->values()->all());
        $groups = $this->assignments->productGroups($ids);

        return $products->map(fn (Product $product) => [
            'id' => $product->id,
            'codigo' => $product->codigo,
            'nombre' => $product->nombre,
            'descripcion' => $product->descripcion,
            'imagen_url' => $product->imagen_ruta ? Storage::disk('public')->url($product->imagen_ruta) : null,
            'tipo' => $product->tipo,
            'categoria_id' => $product->categoria_id,
            'precio_venta' => $product->precio_venta,
            'unidad_medida' => $product->unit?->only(['id', 'codigo', 'nombre']),
            'tipo_afectacion_igv' => $product->igvAffectation?->only(['id', 'codigo', 'nombre']),
            'estacion_preparacion_id' => $productStations[$product->id] ?? null,
            'estacion_efectiva_id' => $productStations[$product->id] ?? $categoryStations[$product->categoria_id] ?? null,
            'modificador_grupo_ids' => $groups[$product->id] ?? [],
            'es_vendible' => $product->es_vendible,
            'es_activo' => $product->es_activo,
        ])->all();
    }

    public function product(Product $product): array
    {
        return $this->products(new Collection([$product]))[0];
    }

    public function station(PreparationStation $station): array
    {
        return ['id' => $station->id, 'nombre' => $station->nombre, 'es_activa' => $station->es_activa];
    }

    public function modifierGroup(ModifierGroup $group): array
    {
        return [
            'id' => $group->id,
            'nombre' => $group->nombre,
            'seleccion_minima' => $group->seleccion_minima,
            'seleccion_maxima' => $group->seleccion_maxima,
            'modificadores' => $group->modifiers->map(fn (Modifier $modifier) => [
                'id' => $modifier->id,
                'nombre' => $modifier->nombre,
                'precio_adicional' => $modifier->precio_adicional,
                'orden' => $modifier->orden,
                'es_activo' => $modifier->es_activo,
            ])->all(),
        ];
    }
}
