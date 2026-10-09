<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;

class IdempotencyKey extends BaseModel
{
    use BelongsToTenant;

    public const UPDATED_AT = null;

    // Cuanto tiempo se recuerda una clave antes de que el comando de limpieza la borre.
    public const TTL_HOURS = 24;

    protected $table = 'claves_idempotencia';

    protected function casts(): array
    {
        return [
            'respuesta_guardada' => 'array',
        ];
    }
}
