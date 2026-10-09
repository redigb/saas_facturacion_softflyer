<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Pedido de una mesa o para llevar (Doc. 08 §8, spec 006). */
class Order extends BaseModel
{
    use BelongsToTenant;

    public const OPEN = 'ABIERTO';

    public const BILL_REQUESTED = 'POR_COBRAR';

    public const CLOSED = 'CERRADO';

    public const CANCELLED = 'ANULADO';

    public const ACTIVE = [self::OPEN, self::BILL_REQUESTED];

    protected $table = 'pedidos';

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'numero_comensales' => 'integer',
            'version' => 'integer',
            'fecha_operacion' => 'date',
            'abierto_en' => 'datetime',
            'cerrado_en' => 'datetime',
        ];
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'mesa_id');
    }

    public function waiter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mozo_id')->withTrashed();
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'pedido_id')->orderBy('id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(KitchenTicket::class, 'pedido_id');
    }
}
