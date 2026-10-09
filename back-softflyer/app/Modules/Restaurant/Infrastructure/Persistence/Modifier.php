<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class Modifier extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'modificadores';

    protected function casts(): array
    {
        return ['precio_adicional' => 'decimal:2', 'es_activo' => 'boolean'];
    }
}
