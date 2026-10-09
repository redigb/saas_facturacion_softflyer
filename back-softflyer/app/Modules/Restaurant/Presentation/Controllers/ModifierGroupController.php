<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Modules\Restaurant\Application\ManageMenu;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Modules\Restaurant\Presentation\MenuPresenter;
use App\Modules\Restaurant\Presentation\Requests\ModifierGroupRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ModifierGroupController
{
    public function __construct(private readonly ManageMenu $menu, private readonly MenuPresenter $presenter) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => ModifierGroup::with('modifiers')->orderBy('nombre')->get()
            ->map(fn (ModifierGroup $group) => $this->presenter->modifierGroup($group))]);
    }

    public function store(ModifierGroupRequest $request): JsonResponse
    {
        $group = $this->menu->saveModifierGroup(new ModifierGroup, $request->validated());

        return response()->json(['data' => $this->presenter->modifierGroup($group)], 201);
    }

    public function update(ModifierGroupRequest $request, ModifierGroup $group): JsonResponse
    {
        $group = $this->menu->saveModifierGroup($group, $request->validated());

        return response()->json(['data' => $this->presenter->modifierGroup($group)]);
    }

    public function destroy(ModifierGroup $group): Response
    {
        $this->menu->deleteModifierGroup($group);

        return response()->noContent();
    }
}
