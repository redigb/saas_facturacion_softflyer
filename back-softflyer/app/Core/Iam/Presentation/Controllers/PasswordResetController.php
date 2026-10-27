<?php

namespace App\Core\Iam\Presentation\Controllers;

use App\Core\Iam\Application\ResetPassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Recuperacion de acceso sin sesion, dentro del subdominio del restaurante (spec 035). */
class PasswordResetController
{
    public function __construct(private readonly ResetPassword $reset) {}

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['correo' => ['required', 'string', 'email', 'max:255']],
            ['correo.required' => 'Ingresa tu correo.', 'correo.email' => 'Ingresa un correo válido.'],
        );

        $this->reset->request(mb_strtolower(trim($data['correo'])));

        return response()->json(['data' => [
            'mensaje' => 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.',
        ]], 202);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'contrasena' => ['required', 'string', 'min:10', 'max:255', 'confirmed'],
        ], [
            'token.required' => 'Abre el enlace completo que te enviamos por correo.',
            'token.size' => 'El enlace no es válido o ya fue usado. Pide uno nuevo.',
            'contrasena.required' => 'Crea una contraseña.',
            'contrasena.min' => 'La contraseña debe tener al menos 10 caracteres.',
            'contrasena.confirmed' => 'Las contraseñas no coinciden.',
        ]);

        $user = $this->reset->complete($data['token'], $data['contrasena']);

        return response()->json(['data' => ['correo' => $user->correo]]);
    }
}
