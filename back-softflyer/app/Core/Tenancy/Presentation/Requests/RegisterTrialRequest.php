<?php

namespace App\Core\Tenancy\Presentation\Requests;

use App\Core\Tenancy\Domain\Ruc;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class RegisterTrialRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'ruc' => preg_replace('/\D/', '', (string) $this->input('ruc')),
            'slug' => mb_strtolower(trim((string) $this->input('slug'))),
            'correo' => mb_strtolower(trim((string) $this->input('correo'))),
            'telefono' => preg_replace('/\D/', '', (string) $this->input('telefono')) ?: null,
        ]);
    }

    public function rules(): array
    {
        return [
            'ruc' => ['required', 'digits:11', function (string $attribute, mixed $value, Closure $fail) {
                if (! Ruc::isValid($value)) {
                    $fail('El RUC no es válido. Revisa los 11 dígitos.');
                }
            }],
            'razon_social' => ['required', 'string', 'max:255'],
            'nombre_comercial' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/'],
            'nombre_contacto' => ['required', 'string', 'max:120'],
            'correo' => ['required', 'email', 'max:255'],
            'telefono' => ['nullable', 'regex:/^9\d{8}$/'],
            'contrasena' => ['required', 'string', 'min:10', 'max:255', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'ruc.required' => 'Ingresa el RUC de tu empresa.',
            'ruc.digits' => 'El RUC tiene 11 dígitos.',
            'razon_social.required' => 'Ingresa la razón social.',
            'nombre_comercial.required' => 'Ingresa el nombre de tu restaurante.',
            'slug.required' => 'Elige la dirección de tu restaurante.',
            'slug.min' => 'La dirección debe tener al menos 3 caracteres.',
            'slug.max' => 'La dirección puede tener hasta 30 caracteres.',
            'slug.regex' => 'Usa solo letras minúsculas, números y guiones.',
            'nombre_contacto.required' => 'Ingresa tu nombre.',
            'correo.required' => 'Ingresa tu correo.',
            'correo.email' => 'Ingresa un correo válido.',
            'telefono.regex' => 'Ingresa un celular de 9 dígitos que empiece con 9.',
            'contrasena.required' => 'Crea una contraseña.',
            'contrasena.min' => 'La contraseña debe tener al menos 10 caracteres.',
            'contrasena.confirmed' => 'Las contraseñas no coinciden.',
        ];
    }
}
