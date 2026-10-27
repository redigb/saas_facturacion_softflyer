<?php

namespace App\Core\Tenancy\Application;

use App\Core\Tenancy\Infrastructure\Mail\VerifyTrialMail;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Paso 1 de la prueba gratis: guarda la solicitud y envia el enlace de verificacion.
 * El restaurante recien se crea cuando el correo se verifica (VerifyTrial).
 */
final class RegisterTrial
{
    public function __construct(private readonly SubdomainAvailability $subdomains) {}

    /**
     * @param  array{ruc: string, razon_social: string, nombre_comercial: string, slug: string, nombre_contacto: string, correo: string, telefono?: ?string, contrasena: string}  $data
     */
    public function handle(array $data, ?string $ip): TrialRegistration
    {
        if (TrialRegistration::where('ruc', $data['ruc'])->whereNotNull('verificado_en')->exists()) {
            throw new BusinessException('RUC_YA_REGISTRADO', 'Este RUC ya usó su prueba gratis. Escríbenos para activar tu plan.', 409, [
                'ruc' => ['Este RUC ya usó su prueba gratis.'],
            ]);
        }

        $this->subdomains->ensureAvailable($data['slug'], exceptRuc: $data['ruc']);

        // Si el mismo RUC tenia una solicitud pendiente, la reemplaza (otro correo, otra contrasena...).
        TrialRegistration::where('ruc', $data['ruc'])->whereNull('verificado_en')->delete();

        $registration = TrialRegistration::create([
            'ruc' => $data['ruc'],
            'razon_social' => $data['razon_social'],
            'nombre_comercial' => $data['nombre_comercial'],
            'slug' => $data['slug'],
            'nombre_contacto' => $data['nombre_contacto'],
            'correo' => $data['correo'],
            'telefono' => $data['telefono'] ?? null,
            'contrasena_hash' => Hash::make($data['contrasena']),
            'ip' => $ip,
        ]);

        $this->sendVerification($registration);

        return $registration;
    }

    public function sendVerification(TrialRegistration $registration): void
    {
        $token = Str::random(64);

        $registration->update([
            'token_hash' => hash('sha256', $token),
            'token_expira_en' => now()->addHours(config('softflyer.prueba.verificacion_horas')),
        ]);

        $url = rtrim(config('softflyer.frontend_url'), '/').'/registro/verificar?token='.$token;

        Mail::to($registration->correo, $registration->nombre_contacto)
            ->send(new VerifyTrialMail($registration->nombre_contacto, $registration->nombre_comercial, $url));
    }
}
