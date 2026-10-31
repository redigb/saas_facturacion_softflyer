<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Un plato del pedido; se anula con motivo, nunca se borra (Doc. 08 §8). */
class OrderItem extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'detalle_pedidos';

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'precio_unitario' => 'decimal:2',
            'descuento' => 'decimal:2',
            'anulado_en' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'producto_id')->withTrashed();
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(KitchenTicket::class, 'comanda_id');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'anulado_por')->withTrashed();
    }

    public function modifiers(): BelongsToMany
    {
        return $this->belongsToMany(Modifier::class, 'detalle_pedido_modificador', 'detalle_pedido_id', 'modificador_id')
            ->withPivot('precio_adicional');
    }

    /** cantidad × (precio + modificadores), redondeado a céntimos. */
    public function subtotal(): string
    {
        $extras = $this->modifiers->sum(fn (Modifier $modifier) => (float) $modifier->pivot->precio_adicional);

        return number_format(round((float) $this->cantidad * ((float) $this->precio_unitario + $extras), 2), 2, '.', '');
    }
}
