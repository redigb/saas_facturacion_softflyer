<?php

namespace App\Core\Iam\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Cambio rapido de usuario en una tablet compartida (spec 004, Doc. 08 §4).
 *
 * El PIN no es una credencial de entrada: solo funciona desde un dispositivo que ya tiene
 * una sesion valida del mismo restaurante. 4 digitos expuestos a internet serian atacables.
 */
final class SwitchUserWithPin
{
    /**
     * @return array{user: User, token: NewAccessToken}
     */
    public function handle(PersonalAccessToken $currentSession, int $userId, string $pin, string $device): array
    {
        $throttleKey = 'pin:'.$currentSession->tokenable->inquilino_id.':'.$userId;

        if (RateLimiter::tooManyAttempts($throttleKey, config('softflyer.login.max_intentos'))) {
            $minutes = (int) ceil(RateLimiter::availableIn($throttleKey) / 60);

            throw new BusinessException('BLOQUEO_POR_INTENTOS', "Demasiados PIN incorrectos. Intenta de nuevo en {$minutes} min.", 429);
        }

        // El Global Scope y RLS limitan la busqueda al restaurante del subdominio.
        $user = User::where('es_activo', true)->whereNotNull('pin_hash')->find($userId);

        if ($user === null || ! Hash::check($pin, $user->pin_hash)) {
            RateLimiter::hit($throttleKey, config('softflyer.login.bloqueo_segundos'));

            throw new BusinessException('PIN_INVALIDO', 'PIN incorrecto.', 401);
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken($device, ['*'], now()->addMinutes(config('sanctum.expiration')));

        // En una tablet compartida no quedan sesiones colgadas del usuario anterior.
        $currentSession->delete();

        return ['user' => $user, 'token' => $token];
    }
}
