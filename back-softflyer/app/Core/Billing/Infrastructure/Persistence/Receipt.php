<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

/** Comprobante de una venta: boleta o factura (spec 010). Simulado hasta integrar Greenter. */
class Receipt extends BaseModel
{
    use BelongsToTenant;

    public const ISSUED = 'EMITIDO';

    protected $table = 'comprobantes';

    protected function casts(): array
    {
        return [
            'correlativo' => 'integer',
            'op_gravada' => 'decimal:2',
            'igv' => 'decimal:2',
            'total' => 'decimal:2',
            'es_simulado' => 'boolean',
            'emitido_en' => 'datetime',
        ];
    }
}
