<?php

namespace App\Core\Tenancy\Application;

use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;

/**
 * Paso 2 de la prueba gratis: el enlace del correo crea el restaurante con su
 * administrador y N dias de prueba.
 */
final class VerifyTrial
{
    public function __construct(private readonly ProvisionTenant $provision) {}

    public function handle(string $token): Tenant
    {
        return DB::transaction(function () use ($token) {
            $registration = TrialRegistration::where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if ($registration === null) {
                throw new BusinessException('ENLACE_INVALIDO', 'El enlace no es válido o ya fue usado.', 404);
            }

            if ($registration->token_expira_en->isPast()) {
                throw new BusinessException('ENLACE_VENCIDO', 'El enlace venció. Pide uno nuevo desde la página de registro.', 410);
            }

            $tenant = $this->provision->handle(
                ['slug' => $registration->slug, 'nombre' => $registration->nombre_comercial, 'plan' => 'PRUEBA', 'estado' => TenantStatus::Trial],
                ['nombre' => $registration->nombre_contacto, 'correo' => $registration->correo, 'contrasena' => $registration->contrasena_hash],
                ['ruc' => $registration->ruc, 'razon_social' => $registration->razon_social],
            );

            $registration->update([
                'verificado_en' => now(),
                'inquilino_id' => $tenant->id,
                'contrasena_hash' => null,
                'token_hash' => null,
                'token_expira_en' => null,
            ]);

            return $tenant;
        });
    }
}
