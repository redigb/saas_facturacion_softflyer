<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Infrastructure\Persistence\Promotion;
use App\Shared\Domain\Money;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Precio efectivo de la carta con promociones vigentes (spec 039).
 * El alcance directo al plato gana sobre la categoría; la prioridad manda sobre ambos.
 */
final class PromotionPricing
{
    /**
     * @param  iterable<Product>  $products
     * @return array<int, array{precio: string, descuento: string, promocion: array{id: int, nombre: string, tipo: string, valor: string}}>
     */
    public function forProducts(iterable $products, ?CarbonInterface $at = null): array
    {
        $products = collect($products);
        $now = CarbonImmutable::instance($at ?? now());

        $promotions = Promotion::query()
            ->where('es_activa', true)
            ->where('desde', '<=', $now)
            ->where('hasta', '>=', $now)
            ->orderByDesc('prioridad')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (Promotion $promotion) => $promotion->appliesAt($now));

        if ($promotions->isEmpty() || $products->isEmpty()) {
            return [];
        }

        $ids = $promotions->modelKeys();
        $byProduct = DB::table('promocion_producto')->whereIn('promocion_id', $ids)->get(['promocion_id', 'producto_id'])->groupBy('promocion_id');
        $byCategory = DB::table('promocion_categoria')->whereIn('promocion_id', $ids)->get(['promocion_id', 'categoria_id'])->groupBy('promocion_id');

        $prices = [];
        foreach ($products as $product) {
            $original = (float) $product->precio_venta;
            $match = $this->firstMatch($promotions, $byProduct, $byCategory, (int) $product->id, $product->categoria_id === null ? null : (int) $product->categoria_id);

            if ($match === null) {
                continue;
            }

            $price = $match->priceFor($original);
            if ($price === null) {
                continue;
            }

            $prices[$product->id] = [
                'precio' => Money::format(Money::cents($price)),
                'descuento' => Money::format(Money::cents($original - $price)),
                'promocion' => [
                    'id' => (int) $match->id,
                    'nombre' => $match->nombre,
                    'tipo' => $match->tipo,
                    'valor' => $match->valor,
                ],
            ];
        }

        return $prices;
    }

    /** Primero una promo que incluya el plato; si no, la que incluya su categoría. */
    private function firstMatch(Collection $promotions, Collection $byProduct, Collection $byCategory, int $productId, ?int $categoryId): ?Promotion
    {
        foreach ($promotions as $promotion) {
            $productos = $byProduct->get($promotion->id, collect())->pluck('producto_id')->map(fn ($id) => (int) $id);
            if ($productos->contains($productId)) {
                return $promotion;
            }
        }

        if ($categoryId === null) {
            return null;
        }

        foreach ($promotions as $promotion) {
            $categorias = $byCategory->get($promotion->id, collect())->pluck('categoria_id')->map(fn ($id) => (int) $id);
            if ($categorias->contains($categoryId)) {
                return $promotion;
            }
        }

        return null;
    }
}
