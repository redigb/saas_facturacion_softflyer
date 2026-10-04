<?php

namespace App\Core\Tenancy\Domain;

/**
 * DEMO:   restaurante publico de muestra, con datos ficticios.
 * PRUEBA: cuenta propia de un cliente en su periodo de prueba gratis.
 * PAGO:   cuenta propia de un cliente con plan contratado.
 */
enum AccountMode: string
{
    case Demo = 'DEMO';
    case Trial = 'PRUEBA';
    case Paid = 'PAGO';

    public static function for(bool $isDemo, TenantStatus $status): self
    {
        return match (true) {
            $isDemo => self::Demo,
            $status === TenantStatus::Trial => self::Trial,
            default => self::Paid,
        };
    }
}
