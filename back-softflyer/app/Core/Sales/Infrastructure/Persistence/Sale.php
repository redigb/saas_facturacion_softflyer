<?php

namespace App\Core\Sales\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Venta cobrada en un turno de caja (Doc. 08 §9). El comprobante se engancha después (H3). */
class Sale extends BaseModel
{
    use BelongsToTenant;

    public const ISSUED = 'EMITIDA';

    public const VOIDED = 'ANULADA';

    protected $table = 'ventas';

    protected function casts(): array
    {
        return [
            'op_gravada' => 'decimal:2',
            'igv' => 'decimal:2',
            'total' => 'decimal:2',
            'monto_propina' => 'decimal:2',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'venta_id')->orderBy('id');
    }
}
