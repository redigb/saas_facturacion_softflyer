<?php

namespace App\Shared\Exceptions;

use RuntimeException;

/**
 * Error esperado de negocio, con un codigo estable para el frontend (Doc. 07 §3.3).
 */
class BusinessException extends RuntimeException
{
    public function __construct(
        public readonly string $codigo,
        string $mensaje,
        public readonly int $status = 409,
        public readonly ?array $detalles = null,
    ) {
        parent::__construct($mensaje);
    }
}
