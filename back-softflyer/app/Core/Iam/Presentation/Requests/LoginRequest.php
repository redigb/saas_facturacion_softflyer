<?php

namespace App\Core\Iam\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'correo' => ['required', 'string', 'email', 'max:255'],
            'contrasena' => ['required', 'string', 'max:255'],
            'dispositivo' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'correo.required' => 'Ingresa tu correo.',
            'correo.email' => 'Ingresa un correo válido.',
            'correo.max' => 'El correo es demasiado largo.',
            'contrasena.required' => 'Ingresa tu contraseña.',
            'contrasena.max' => 'La contraseña es demasiado larga.',
        ];
    }

    public function email(): string
    {
        return mb_strtolower(trim($this->string('correo')));
    }
}
