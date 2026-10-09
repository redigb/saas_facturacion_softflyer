<?php

namespace App\Core\Iam\Presentation\Requests;

use App\Core\Iam\Infrastructure\Persistence\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamMemberRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('correo')) {
            $this->merge(['correo' => mb_strtolower(trim((string) $this->input('correo')))]);
        }
    }

    public function rules(): array
    {
        $creating = $this->isMethod('POST');
        $required = $creating ? 'required' : 'sometimes';
        $current = $this->route('user');

        return [
            'nombre' => [$required, 'string', 'max:120'],
            'correo' => [$required, 'email', 'max:255', function (string $attribute, mixed $value, Closure $fail) use ($current) {
                $taken = User::withTrashed()
                    ->whereRaw('lower(correo) = ?', [$value])
                    ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                    ->exists();

                if ($taken) {
                    $fail('Ya hay alguien del equipo con ese correo.');
                }
            }],
            'contrasena' => [$creating ? 'required' : 'sometimes', 'string', 'min:10', 'max:255'],
            'rol_ids' => [$required, 'array', 'min:1'],
            'rol_ids.*' => ['integer', 'distinct', Rule::exists('roles', 'id')],
            'pin' => $creating ? ['sometimes', 'nullable', 'digits_between:4,6'] : ['prohibited'],
            'es_activo' => $creating ? ['prohibited'] : ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Ingresa el nombre.',
            'correo.required' => 'Ingresa el correo.',
            'correo.email' => 'Ingresa un correo válido.',
            'contrasena.required' => 'Crea una contraseña.',
            'contrasena.min' => 'La contraseña debe tener al menos 10 caracteres.',
            'rol_ids.required' => 'Elige un rol.',
            'rol_ids.min' => 'Elige un rol.',
            'rol_ids.*.exists' => 'Ese rol no existe en tu restaurante.',
            'pin.digits_between' => 'El PIN tiene de 4 a 6 dígitos.',
            'pin.prohibited' => 'El PIN se cambia desde su propia opción.',
        ];
    }
}
