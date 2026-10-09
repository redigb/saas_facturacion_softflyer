<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Inventory\Infrastructure\Persistence\Category;
use App\Modules\Restaurant\Application\ManageMenu;
use App\Modules\Restaurant\Presentation\MenuPresenter;
use App\Modules\Restaurant\Presentation\Requests\CategoryRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class CategoryController
{
    public function __construct(private readonly ManageMenu $menu, private readonly MenuPresenter $presenter) {}

    public function index(): JsonResponse
    {
        $categories = Category::withCount('products')->orderBy('orden')->orderBy('id')->get();

        return response()->json(['data' => $this->presenter->categories($categories)]);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $category = $this->menu->saveCategory(new Category, $request->validated());

        return response()->json(['data' => $this->presenter->category($category)], 201);
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $category = $this->menu->saveCategory($category, $request->validated());

        return response()->json(['data' => $this->presenter->category($category)]);
    }

    public function destroy(Category $category): Response
    {
        $this->menu->deleteCategory($category);

        return response()->noContent();
    }

    public function reorder(Request $request): Response
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', Rule::exists('categorias', 'id')->whereNull('eliminado_en')],
        ], [
            'ids.*.exists' => 'Una de las categorías no existe.',
        ]);

        $this->menu->reorderCategories($data['ids']);

        return response()->noContent();
    }
}
