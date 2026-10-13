<?php

namespace App\Core\Cash\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

/** Ingreso o egreso manual dentro de un turno. Los cobros no pasan por aquí (Doc. 08 §10). */
class CashMovement extends BaseModel
{
    use BelongsToTenant;

    public const INCOME = 'INGRESO';

    public const EXPENSE = 'EGRESO';

    protected $table = 'movimientos_caja';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }
}
