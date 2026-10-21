<?php

namespace App\Core\Billing\Application;

/** Lo que SUNAT contestó: el XML que firmamos, el CDR (zip) y el veredicto. */
final readonly class SunatResponse
{
    /** SUNAT ya tenía el comprobante (1033) pero esta respuesta no trae su CDR. */
    public const REGISTERED = 'REGISTRADO';

    public function __construct(
        public string $status,          // ACEPTADO | OBSERVADO | RECHAZADO | REGISTRADO
        public string $code,
        public string $message,
        public string $xml,
        public ?string $cdrZip = null,
        public ?string $hash = null,
    ) {}
}
