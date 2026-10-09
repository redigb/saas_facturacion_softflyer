<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Comanda: los platos que viajaron juntos a una estación (Doc. 08 §8). */
class KitchenTicket extends BaseModel
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $table = 'comandas';

    protected function casts(): array
    {
        return ['numero' => 'integer', 'enviada_en' => 'datetime', 'impresa_en' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'pedido_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enviada_por')->withTrashed();
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'comanda_id')->orderBy('id');
    }
}
