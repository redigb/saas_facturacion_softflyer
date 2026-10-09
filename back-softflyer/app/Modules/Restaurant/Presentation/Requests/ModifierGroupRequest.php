<?php

namespace App\Modules\Restaurant\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModifierGroupRequest extends FormRequest
{
    public function rules(): array
    {
        $required = $this->isMethod('PATCH') ? 'sometimes' : 'required';
        $current = $this->route('group');

        return [
            'nombre' => [$required, 'string', 'max:60'],
            'seleccion_minima' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'seleccion_maxima' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'modificadores' => [$required, 'array', 'min:1'],
            'modificadores.*.id' => ['sometimes', 'integer',
                Rule::exists('modificadores', 'id')->where('modificador_grupo_id', $current?->getKey() ?? 0)],
            'modificadores.*.nombre' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'modificadores.*.precio_adicional' => ['sometimes', 'numeric', 'min:0', 'decimal:0,2'],
            'modificadores.*.es_activo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Ponle un nombre al grupo.',
            'modificadores.required' => 'Agrega al menos una opción.',
            'modificadores.min' => 'Agrega al menos una opción.',
            'modificadores.*.nombre.required' => 'Cada opción necesita un nombre.',
            'modificadores.*.nombre.distinct' => 'Hay opciones repetidas.',
            'modificadores.*.precio_adicional.min' => 'El precio adicional no puede ser negativo.',
            'modificadores.*.id.exists' => 'Una de las opciones no pertenece a este grupo.',
            'seleccion_maxima.min' => 'La selección máxima debe ser al menos 1.',
        ];
    }
}
