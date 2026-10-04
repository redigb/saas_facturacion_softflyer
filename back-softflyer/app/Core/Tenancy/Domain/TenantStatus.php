<?php

namespace App\Core\Tenancy\Domain;

/**
 * Ciclo de vida del inquilino (Doc. 03 §2).
 */
enum TenantStatus: string
{
    case Trial = 'PRUEBA';
    case Active = 'ACTIVO';
    case Overdue = 'MOROSO';
    case Suspended = 'SUSPENDIDO';
    case Cancelled = 'CANCELADO';

    // Un suspendido entra en solo lectura; solo un cancelado pierde el acceso.
    public function allowsLogin(): bool
    {
        return $this !== self::Cancelled;
    }
}
