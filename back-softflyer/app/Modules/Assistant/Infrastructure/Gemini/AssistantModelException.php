<?php

namespace App\Modules\Assistant\Infrastructure\Gemini;

use RuntimeException;

/** Falla del proveedor de IA. Su detalle nunca se expone al cliente ni se registra. */
final class AssistantModelException extends RuntimeException
{
    public const NOT_CONFIGURED = 'no_configurado';

    public const UNAVAILABLE = 'no_disponible';

    public const QUOTA = 'sin_credito';

    private function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }

    public static function notConfigured(): self
    {
        return new self(self::NOT_CONFIGURED);
    }

    public static function unavailable(): self
    {
        return new self(self::UNAVAILABLE);
    }

    public static function quota(): self
    {
        return new self(self::QUOTA);
    }
}
