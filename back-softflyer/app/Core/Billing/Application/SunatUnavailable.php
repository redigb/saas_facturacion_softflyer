<?php

namespace App\Core\Billing\Application;

use RuntimeException;

/**
 * SUNAT no atendió (caída, timeout, mantenimiento): el envío se reintenta, el comprobante no se rechaza.
 * `maybeReceived` marca el corte ambiguo (se envió y se perdió la respuesta): antes de reenviar se consulta.
 */
final class SunatUnavailable extends RuntimeException
{
    public function __construct(string $message, public readonly bool $maybeReceived = false, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
