<?php

namespace App\Modules\Restaurant\Presentation\Requests;

use App\Core\Inventory\Infrastructure\Persistence\Category;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function rules(): array
    {
        $required = $this->isMethod('PATCH') ? 'sometimes' : 'required';
        $current = $this->route('category');

        return [
            'nombre' => [$required, 'string', 'max:80', function (string $attribute, mixed $value, Closure $fail) use ($current) {
                $taken = Category::whereRaw('lower(nombre) = lower(?)', [trim((string) $value)])
                    ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                    ->exists();

                if ($taken) {
                    $fail('Ya tienes una categoría con ese nombre.');
                }
            }],
            'color' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'es_activa' => ['sometimes', 'boolean'],
            'estacion_preparacion_id' => ['sometimes', 'nullable', 'integer', Rule::exists('estaciones_preparacion', 'id')],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Ponle un nombre a la categoría.',
            'nombre.max' => 'El nombre puede tener hasta 80 caracteres.',
            'color.regex' => 'Elige un color válido.',
            'estacion_preparacion_id.exists' => 'Elige una estación válida.',
        ];
    }
}
