<?php

namespace App\Core\Iam\Application;

use App\Core\Iam\Infrastructure\Mail\ActivateAccountMail;
use App\Core\Iam\Infrastructure\Mail\PasswordChangedMail;
use App\Core\Iam\Infrastructure\Mail\ResetPasswordMail;
use App\Core\Iam\Infrastructure\Persistence\PasswordReset;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Restablecer la contrasena con un enlace de un solo uso (Doc. 06 §3, spec 035). La activacion
 * de una cuenta nueva es el mismo enlace con otro origen (spec 036).
 * Corre dentro del inquilino ya resuelto: el enlace lleva el subdominio, asi que el
 * token se busca bajo RLS. Nadie (ni soporte) llega a conocer la contrasena.
 */
final class ResetPassword
{
    public const FROM_USER = 'USUARIO';

    public const FROM_PLATFORM = 'PLATAFORMA';

    public const FROM_ACTIVATION = 'ACTIVACION';

    private const MINUTES = [
        self::FROM_USER => 'softflyer.restablecimiento.minutos_usuario',
        self::FROM_PLATFORM => 'softflyer.restablecimiento.minutos_plataforma',
        self::FROM_ACTIVATION => 'softflyer.restablecimiento.minutos_activacion',
    ];

    public function __construct(private readonly TenantContext $context) {}

    /** "Olvidé mi contraseña": responde igual exista o no el correo, para no revelar cuentas. */
    public function request(string $email): void
    {
        $tenant = $this->context->tenant();
        $key = 'restablecer:'.$tenant->getKey().':'.$email;

        if (! $tenant->estado->allowsLogin() || RateLimiter::tooManyAttempts($key, config('softflyer.restablecimiento.max_solicitudes'))) {
            return;
        }
        RateLimiter::hit($key, config('softflyer.restablecimiento.ventana_segundos'));

        $user = User::query()->where('correo', $email)->where('es_activo', true)->first();

        if ($user !== null) {
            $this->sendLink($user, $this->issue($user, self::FROM_USER));
        }
    }

    /**
     * Genera un enlace nuevo e invalida los anteriores del usuario.
     *
     * @return array{url: string, expira_en: CarbonInterface, origen: string}
     */
    public function issue(User $user, string $origin): array
    {
        $token = Str::random(64);

        PasswordReset::query()->where('usuario_id', $user->id)->whereNull('usado_en')->delete();
        $reset = PasswordReset::create([
            'usuario_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'origen' => $origin,
            'expira_en' => now()->addMinutes(config(self::MINUTES[$origin])),
        ]);

        $path = $origin === self::FROM_ACTIVATION ? '/activar' : '/restablecer';

        return ['url' => $this->frontendUrl($path.'?token='.$token), 'expira_en' => $reset->expira_en, 'origen' => $origin];
    }

    /** @param array{url: string, expira_en: CarbonInterface, origen: string} $link */
    public function sendLink(User $user, array $link): void
    {
        $restaurant = $this->context->tenant()->nombre;
        $validFor = now()->diffForHumans($link['expira_en'], ['syntax' => CarbonInterface::DIFF_ABSOLUTE, 'locale' => 'es']);

        Mail::to($user->correo, $user->nombre)->send($link['origen'] === self::FROM_ACTIVATION
            ? new ActivateAccountMail($user->nombre, $restaurant, $link['url'], $validFor, $this->frontendUrl(''))
            : new ResetPasswordMail($user->nombre, $restaurant, $link['url'], $validFor));
    }

    /** Usa el enlace: fija la contrasena nueva y cierra todas las sesiones del usuario. */
    public function complete(string $token, string $password): User
    {
        $tenant = $this->context->tenant();

        if (! $tenant->estado->allowsLogin()) {
            throw new BusinessException('INQUILINO_CANCELADO', 'Esta cuenta fue cancelada. Solo puedes exportar tus datos.', 403);
        }

        [$user, $origin] = DB::transaction(function () use ($token, $password) {
            $reset = PasswordReset::query()
                ->where('token_hash', hash('sha256', $token))
                ->whereNull('usado_en')
                ->lockForUpdate()
                ->first();

            if ($reset === null) {
                throw new BusinessException('ENLACE_INVALIDO', 'El enlace no es válido o ya fue usado. Pide uno nuevo.', 404);
            }
            if ($reset->expira_en->isPast()) {
                throw new BusinessException('ENLACE_VENCIDO', 'El enlace venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?".', 410);
            }

            $user = $reset->user;
            if ($user === null || ! $user->es_activo) {
                throw new BusinessException('USUARIO_INACTIVO', 'Tu usuario está desactivado. Contacta al administrador.', 403);
            }

            $user->contrasena = $password;
            $user->save();
            $reset->update(['usado_en' => now()]);
            PasswordReset::query()->where('usuario_id', $user->id)->whereNull('usado_en')->delete();
            $user->tokens()->delete();

            return [$user, $reset->origen];
        });

        // Quien quedo bloqueado por intentos fallidos ya demostro ser el dueno del correo.
        RateLimiter::clear('login:'.$tenant->getKey().':'.$user->correo);

        // Quien acaba de activar su cuenta no necesita que le avisen que "su contrasena cambio".
        if ($origin !== self::FROM_ACTIVATION) {
            Mail::to($user->correo, $user->nombre)->send(new PasswordChangedMail(
                $user->nombre,
                $tenant->nombre,
                $this->frontendUrl('/login'),
                now()->timezone('America/Lima')->format('d/m/Y H:i'),
            ));
        }

        return $user;
    }

    /** {slug}.{frontend}: el enlace abre el subdominio del restaurante (Doc. 06 §1.1). */
    private function frontendUrl(string $path): string
    {
        $base = parse_url(config('softflyer.frontend_url'));
        $port = isset($base['port']) ? ':'.$base['port'] : '';

        return ($base['scheme'] ?? 'https').'://'.$this->context->tenant()->slug.'.'.$base['host'].$port.$path;
    }
}
