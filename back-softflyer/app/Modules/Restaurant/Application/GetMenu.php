<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Inventory\Infrastructure\Persistence\Category;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Infrastructure\Persistence\MenuAssignments;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;

/**
 * Carta completa y normalizada para el dispositivo del mozo (spec 002): se descarga una vez
 * y se toma el pedido sin consultar al servidor por cada plato.
 */
final class GetMenu
{
    public function __construct(private readonly MenuAssignments $assignments) {}

    public function handle(): array
    {
        $categories = Category::where('es_activa', true)->orderBy('orden')->orderBy('id')->get();
        $products = Product::where('es_activo', true)
            ->where('es_vendible', true)
            ->where(fn ($query) => $query->whereNull('categoria_id')->orWhereIn('categoria_id', $categories->modelKeys()))
            ->orderBy('nombre')
            ->get();

        $categoryStations = $this->assignments->categoryStations();
        $productStations = $this->assignments->productStations();
        $productGroups = $this->assignments->productGroups();

        $groups = ModifierGroup::with(['modifiers' => fn ($query) => $query->where('es_activo', true)])->orderBy('nombre')->get();

        return [
            'version' => $this->version(),
            'categorias' => $categories->map(fn (Category $category) => [
                'id' => $category->id,
                'nombre' => $category->nombre,
                'color' => $category->color,
                'orden' => $category->orden,
                'producto_ids' => $products->where('categoria_id', $category->id)->modelKeys(),
            ])->all(),
            'productos' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'nombre' => $product->nombre,
                'precio_venta' => $product->precio_venta,
                'tipo' => $product->tipo,
                'categoria_id' => $product->categoria_id,
                'estacion_efectiva_id' => $productStations[$product->id] ?? $categoryStations[$product->categoria_id] ?? null,
                'modificador_grupo_ids' => $productGroups[$product->id] ?? [],
            ])->all(),
            'modificador_grupos' => $groups->map(fn (ModifierGroup $group) => [
                'id' => $group->id,
                'nombre' => $group->nombre,
                'seleccion_minima' => $group->seleccion_minima,
                'seleccion_maxima' => $group->seleccion_maxima,
                'modificadores' => $group->modifiers->map(fn ($modifier) => [
                    'id' => $modifier->id,
                    'nombre' => $modifier->nombre,
                    'precio_adicional' => $modifier->precio_adicional,
                ])->all(),
            ])->all(),
            'estaciones' => PreparationStation::where('es_activa', true)->orderBy('nombre')->get(['id', 'nombre'])->toArray(),
        ];
    }

    /** Ultimo cambio de la carta, en UTC. Incluye lo borrado para que un borrado tambien cambie la version. */
    private function version(): ?string
    {
        $latest = collect([
            Category::withTrashed()->max('actualizado_en'),
            Product::withTrashed()->max('actualizado_en'),
            ModifierGroup::max('actualizado_en'),
            PreparationStation::max('actualizado_en'),
        ])->filter()->max();

        return $latest === null ? null : now()->parse($latest)->utc()->format('Y-m-d\TH:i:s\Z');
    }
}
