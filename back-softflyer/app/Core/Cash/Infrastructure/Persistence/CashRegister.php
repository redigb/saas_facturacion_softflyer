<?php

namespace App\Core\Cash\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

/** Caja física o virtual de una sucursal (Doc. 08 §10). */
class CashRegister extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'cajas';

    protected function casts(): array
    {
        return ['es_activa' => 'boolean'];
    }
}
