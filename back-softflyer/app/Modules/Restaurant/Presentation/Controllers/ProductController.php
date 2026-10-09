<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Application\ManageMenu;
use App\Modules\Restaurant\Presentation\MenuPresenter;
use App\Modules\Restaurant\Presentation\Requests\ProductRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductController
{
    public function __construct(private readonly ManageMenu $menu, private readonly MenuPresenter $presenter) {}

    /** Paginacion offset (Doc. 07 §4): ?pagina=&por_pagina=&categoria_id=&buscar=&activo= */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'pagina' => ['sometimes', 'integer', 'min:1'],
            'por_pagina' => ['sometimes', 'integer', 'between:1,100'],
            'categoria_id' => ['sometimes', 'integer'],
            'buscar' => ['sometimes', 'nullable', 'string', 'max:120'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $page = Product::query()
            ->whereIn('tipo', ['PLATO', 'BEBIDA'])
            ->when(isset($filters['categoria_id']), fn ($query) => $query->where('categoria_id', $filters['categoria_id']))
            ->when($filters['buscar'] ?? null, function ($query, string $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                $query->where(fn ($query) => $query->where('nombre', 'ilike', $like)->orWhere('codigo', 'ilike', $like));
            })
            ->when($request->has('activo'), fn ($query) => $query->where('es_activo', $request->boolean('activo')))
            ->orderBy('nombre')
            ->orderBy('id')
            ->paginate($filters['por_pagina'] ?? 20, ['*'], 'pagina', $filters['pagina'] ?? 1);

        return response()->json([
            'data' => $this->presenter->products($page->getCollection()),
            'meta' => [
                'pagina_actual' => $page->currentPage(),
                'por_pagina' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $this->presenter->product($product)]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = $this->menu->saveProduct(new Product, $request->validated());

        return response()->json(['data' => $this->presenter->product($product)], 201);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->menu->saveProduct($product, $request->validated());

        return response()->json(['data' => $this->presenter->product($product)]);
    }

    public function destroy(Product $product): Response
    {
        $this->menu->deleteProduct($product);

        return response()->noContent();
    }
}
