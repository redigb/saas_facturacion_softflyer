<?php

namespace App\Core\Sales\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

/** Una porción del pago de una venta con un método (Doc. 08 §9). */
class Payment extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'pagos';

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'monto_recibido' => 'decimal:2',
            'vuelto' => 'decimal:2',
        ];
    }
}
