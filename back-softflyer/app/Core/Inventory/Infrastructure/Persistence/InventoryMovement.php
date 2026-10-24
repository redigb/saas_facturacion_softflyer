<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends BaseModel
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $table = 'movimientos_inventario';

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:4',
            'saldo_anterior' => 'decimal:4',
            'saldo_resultante' => 'decimal:4',
            'estado_anterior' => 'array',
            'estado_resultante' => 'array',
            'creado_en' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
