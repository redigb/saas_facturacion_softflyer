<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Billing\Infrastructure\Persistence\IgvAffectationType;
use App\Core\Billing\Infrastructure\Persistence\UnitOfMeasure;
use App\Core\Inventory\Infrastructure\Persistence\Category;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Modules\Restaurant\Infrastructure\Persistence\MenuAssignments;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Altas y cambios de la carta (spec 002). Guarda lo del Core (categorias, productos)
 * y lo del modulo (estacion, modificadores) en una sola transaccion.
 */
final class ManageMenu
{
    // Lo que el duenio no tiene por que conocer: unidad "NIU" y afectacion "10" (gravado).
    private const DEFAULT_UNIT = 'NIU';

    private const DEFAULT_IGV_AFFECTATION = '10';

    public function __construct(private readonly MenuAssignments $assignments) {}

    public function saveCategory(Category $category, array $data): Category
    {
        return DB::transaction(function () use ($category, $data) {
            if (! $category->exists) {
                $category->orden = (int) Category::max('orden') + 1;
            }

            $category->fill(Arr::only($data, ['nombre', 'color', 'es_activa']))->save();

            if (array_key_exists('estacion_preparacion_id', $data)) {
                $this->assignments->setCategoryStation($category->id, $data['estacion_preparacion_id']);
                $category->touch();
            }

            return $category->refresh();
        });
    }

    public function deleteCategory(Category $category): void
    {
        if ($category->products()->where('es_activo', true)->exists()) {
            throw new BusinessException('CATEGORIA_CON_PRODUCTOS', 'La categoría tiene productos activos. Muévelos o desactívalos primero.');
        }

        DB::transaction(function () use ($category) {
            $category->products()->update(['categoria_id' => null]);
            $this->assignments->setCategoryStation($category->id, null);
            $category->delete();
        });
    }

    /** @param list<int> $ids todas las categorias, en el nuevo orden */
    public function reorderCategories(array $ids): void
    {
        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $order => $id) {
                Category::whereKey($id)->update(['orden' => $order, 'actualizado_en' => now()]);
            }
        });
    }

    public function saveProduct(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            if (! $product->exists) {
                $product->fill([
                    'codigo' => $data['codigo'] ?? $this->nextProductCode(),
                    'unidad_medida_id' => $data['unidad_medida_id'] ?? UnitOfMeasure::where('codigo', self::DEFAULT_UNIT)->value('id'),
                    'tipo_afectacion_igv_id' => $data['tipo_afectacion_igv_id']
                        ?? IgvAffectationType::where('codigo', self::DEFAULT_IGV_AFFECTATION)->value('id'),
                ]);
            }

            $product->fill(Arr::only($data, [
                'nombre', 'tipo', 'precio_venta', 'categoria_id', 'codigo', 'descripcion',
                'unidad_medida_id', 'tipo_afectacion_igv_id', 'es_vendible', 'es_activo',
            ]))->save();

            $touched = false;
            if (array_key_exists('estacion_preparacion_id', $data)) {
                $this->assignments->setProductStation($product->id, $data['estacion_preparacion_id']);
                $touched = true;
            }
            if (array_key_exists('modificador_grupo_ids', $data)) {
                $this->assignments->setProductGroups($product->id, $data['modificador_grupo_ids'] ?? []);
                $touched = true;
            }

            // La carta del mozo detecta cambios por la fecha: tambien los de estacion y modificadores.
            if ($touched) {
                $product->touch();
            }

            // Trae los valores por defecto de la base (es_activo, es_vendible).
            return $product->refresh();
        });
    }

    public function deleteProduct(Product $product): void
    {
        $product->delete();
    }

    public function saveModifierGroup(ModifierGroup $group, array $data): ModifierGroup
    {
        $min = $data['seleccion_minima'] ?? $group->seleccion_minima ?? 0;
        $max = $data['seleccion_maxima'] ?? $group->seleccion_maxima ?? 1;

        if ($min > $max) {
            throw new BusinessException('VALIDACION', 'Hay campos con errores.', 422, [
                'seleccion_minima' => ['La selección mínima no puede ser mayor que la máxima.'],
            ]);
        }

        return DB::transaction(function () use ($group, $data) {
            $group->fill(Arr::only($data, ['nombre', 'seleccion_minima', 'seleccion_maxima']))->save();

            if (array_key_exists('modificadores', $data)) {
                $this->replaceModifiers($group, $data['modificadores']);
                $group->touch();
            }

            return $group->load('modifiers');
        });
    }

    public function deleteModifierGroup(ModifierGroup $group): void
    {
        if ($this->assignments->groupIsInUse($group->id)) {
            throw new BusinessException('GRUPO_EN_USO', 'Este grupo está asignado a productos. Quítalo de ellos primero.');
        }

        DB::transaction(function () use ($group) {
            $group->modifiers()->delete();
            $group->delete();
        });
    }

    /** La lista enviada es la lista final: lo que no viene se borra, lo que no tiene id se crea. */
    private function replaceModifiers(ModifierGroup $group, array $modifiers): void
    {
        $keep = array_filter(array_column($modifiers, 'id'));
        $group->modifiers()->whereNotIn('id', $keep)->delete();

        foreach (array_values($modifiers) as $order => $item) {
            $attributes = [
                'nombre' => $item['nombre'],
                'precio_adicional' => $item['precio_adicional'] ?? 0,
                'es_activo' => $item['es_activo'] ?? true,
                'orden' => $order,
            ];

            isset($item['id'])
                ? $group->modifiers()->whereKey($item['id'])->update($attributes + ['actualizado_en' => now()])
                : $group->modifiers()->create($attributes);
        }
    }

    private function nextProductCode(): string
    {
        $last = Product::withTrashed()
            ->where('codigo', '~', '^PRD-[0-9]+$')
            ->max(DB::raw('CAST(substring(codigo from 5) AS integer)'));

        return sprintf('PRD-%04d', (int) $last + 1);
    }
}
