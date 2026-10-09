<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class FloorElement extends BaseModel
{
    use BelongsToTenant;

    public const TYPES = ['BARRA', 'PARED', 'PUERTA', 'VENTANA', 'COLUMNA', 'PLANTA', 'BANO', 'CAJA', 'COCINA', 'TEXTO'];

    protected $table = 'elementos_plano';

    protected function casts(): array
    {
        return [
            'pos_x' => 'float',
            'pos_y' => 'float',
            'ancho' => 'float',
            'alto' => 'float',
            'rotacion' => 'integer',
            'capa' => 'integer',
        ];
    }
}
