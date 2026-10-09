<?php

namespace App\Modules\Restaurant\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('codigo')) {
            $this->merge(['codigo' => mb_strtoupper(trim((string) $this->input('codigo'))) ?: null]);
        }
    }

    public function rules(): array
    {
        $required = $this->isMethod('PATCH') ? 'sometimes' : 'required';
        $current = $this->route('product');
        // Un producto vendible necesita precio (CHECK productos_vendible_check).
        $sellable = $this->boolean('es_vendible', $current?->es_vendible ?? true);
        $price = match (true) {
            ! $sellable => ['nullable'],
            $current === null || $current->precio_venta === null => ['required'],
            default => ['sometimes', 'required'],
        };

        return [
            'nombre' => [$required, 'string', 'max:120'],
            'tipo' => [$required, Rule::in(['PLATO', 'BEBIDA'])],
            'precio_venta' => [...$price, 'numeric', 'min:0', 'max:9999999999', 'decimal:0,2'],
            'categoria_id' => ['sometimes', 'nullable', 'integer', Rule::exists('categorias', 'id')->whereNull('eliminado_en')],
            'codigo' => ['sometimes', 'nullable', 'string', 'max:30',
                Rule::unique('productos', 'codigo')->whereNull('eliminado_en')->ignore($current?->getKey())],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unidad_medida_id' => ['sometimes', 'integer', Rule::exists('unidades_medida', 'id')->where('es_activo', true)],
            'tipo_afectacion_igv_id' => ['sometimes', 'integer', Rule::exists('tipos_afectacion_igv', 'id')->where('es_activo', true)],
            'estacion_preparacion_id' => ['sometimes', 'nullable', 'integer', Rule::exists('estaciones_preparacion', 'id')],
            'modificador_grupo_ids' => ['sometimes', 'array'],
            'modificador_grupo_ids.*' => ['integer', 'distinct', Rule::exists('modificador_grupos', 'id')],
            'es_vendible' => ['sometimes', 'boolean'],
            'es_activo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Ponle un nombre al producto.',
            'nombre.max' => 'El nombre puede tener hasta 120 caracteres.',
            'tipo.required' => 'Indica si es plato o bebida.',
            'tipo.in' => 'El tipo debe ser plato o bebida.',
            'precio_venta.required' => 'Ingresa el precio.',
            'precio_venta.numeric' => 'El precio debe ser un número.',
            'precio_venta.min' => 'El precio no puede ser negativo.',
            'precio_venta.decimal' => 'El precio puede tener hasta 2 decimales.',
            'categoria_id.exists' => 'Elige una categoría válida.',
            'codigo.unique' => 'Ya tienes un producto con ese código.',
            'estacion_preparacion_id.exists' => 'Elige una estación válida.',
            'modificador_grupo_ids.*.exists' => 'Uno de los grupos de modificadores no existe.',
        ];
    }
}
