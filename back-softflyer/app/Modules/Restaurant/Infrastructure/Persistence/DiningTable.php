<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class DiningTable extends BaseModel
{
    use BelongsToTenant;

    public const FREE = 'LIBRE';

    protected $table = 'mesas';

    protected function casts(): array
    {
        return [
            'capacidad' => 'integer',
            'pos_x' => 'float',
            'pos_y' => 'float',
            'ancho' => 'float',
            'alto' => 'float',
            'rotacion' => 'integer',
            'es_activa' => 'boolean',
        ];
    }
}
