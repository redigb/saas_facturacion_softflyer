<?php

namespace App\Core\Billing\Application;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Infrastructure\Persistence\Company;

/**
 * Puerta hacia SUNAT (Doc. 04). La implementación real usa Greenter; las pruebas la reemplazan
 * para no salir a internet.
 */
interface SunatGateway
{
    /**
     * @throws SunatUnavailable si SUNAT no atendió
     * @throws SunatAuthFailed si rechazó las credenciales SOL
     */
    public function send(Receipt $receipt): SunatResponse;

    /**
     * El CDR que SUNAT ya tiene de un comprobante (recupera una respuesta perdida). Null si no lo
     * entrega todavía o la consulta no existe en el entorno (en beta no hay).
     *
     * @throws SunatUnavailable
     * @throws SunatAuthFailed
     */
    public function cdr(Receipt $receipt): ?SunatResponse;

    /**
     * Pregunta a SUNAT por un comprobante que no existe: si contesta "no existe" (0011), el usuario y la clave SOL
     * son válidos. Solo existe en producción; en beta no hay con qué verificar (beta acepta cualquier credencial).
     *
     * @return self::CREDENTIALS_*
     *
     * @throws SunatUnavailable
     */
    public function checkCredentials(Company $company): string;

    public const CREDENTIALS_OK = 'OK';

    public const CREDENTIALS_REJECTED = 'RECHAZADAS';

    public const CREDENTIALS_UNVERIFIABLE = 'NO_VERIFICABLE';
}
