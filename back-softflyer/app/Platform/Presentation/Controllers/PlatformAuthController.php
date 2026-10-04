<?php

namespace App\Platform\Presentation\Controllers;

use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class PlatformAuthController
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['correo' => ['required', 'email'], 'contrasena' => ['required', 'string']],
            ['correo.required' => 'Ingresa tu correo.', 'correo.email' => 'Ingresa un correo válido.', 'contrasena.required' => 'Ingresa tu contraseña.'],
        );
        $email = mb_strtolower(trim($data['correo']));
        $throttleKey = 'plataforma-login:'.$email;

        if (RateLimiter::tooManyAttempts($throttleKey, config('softflyer.login.max_intentos'))) {
            throw new BusinessException('BLOQUEO_POR_INTENTOS', 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.', 429);
        }

        $admin = PlatformAdmin::where('correo', $email)->first();

        if ($admin === null || ! $admin->es_activo || ! Hash::check($data['contrasena'], $admin->contrasena)) {
            RateLimiter::hit($throttleKey, config('softflyer.login.bloqueo_segundos'));

            throw new BusinessException('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
        }

        RateLimiter::clear($throttleKey);
        $admin->forceFill(['ultimo_acceso_en' => now()])->save();
        $token = $admin->createToken('plataforma', ['*'], now()->addMinutes(config('sanctum.expiration')));

        return response()->json(['data' => [
            'token' => $token->plainTextToken,
            'expira_en' => $token->accessToken->expires_at?->toIso8601ZuluString(),
            'administrador' => $admin->only('id', 'nombre', 'correo'),
        ]]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->only('id', 'nombre', 'correo')]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
