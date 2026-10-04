<?php

namespace App\Core\Iam\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\NewAccessToken;

/**
 * Inicia sesion dentro del inquilino ya resuelto por subdominio (Doc. 06 §1-2).
 */
final class LoginUser
{
    public function __construct(private readonly TenantContext $context) {}

    /**
     * @return array{user: User, token: NewAccessToken}
     */
    public function handle(string $email, string $password, string $device): array
    {
        $tenant = $this->context->tenant();

        if (! $tenant->estado->allowsLogin()) {
            throw new BusinessException('INQUILINO_CANCELADO', 'Esta cuenta fue cancelada. Solo puedes exportar tus datos.', 403);
        }

        $throttleKey = 'login:'.$tenant->getKey().':'.$email;

        if (RateLimiter::tooManyAttempts($throttleKey, config('softflyer.login.max_intentos'))) {
            $minutes = (int) ceil(RateLimiter::availableIn($throttleKey) / 60);

            throw new BusinessException('BLOQUEO_POR_INTENTOS', "Demasiados intentos fallidos. Intenta de nuevo en {$minutes} min.", 429);
        }

        $user = User::query()->where('correo', $email)->first();

        if ($user === null || ! Hash::check($password, $user->contrasena)) {
            RateLimiter::hit($throttleKey, config('softflyer.login.bloqueo_segundos'));

            throw new BusinessException('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
        }

        if (! $user->es_activo) {
            throw new BusinessException('USUARIO_INACTIVO', 'Tu usuario está desactivado. Contacta al administrador.', 403);
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken($device, ['*'], now()->addMinutes(config('sanctum.expiration')));

        return ['user' => $user, 'token' => $token];
    }
}
