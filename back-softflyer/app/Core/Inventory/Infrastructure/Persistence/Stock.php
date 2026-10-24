<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'existencias';

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:4',
            'stock_minimo' => 'decimal:4',
            'cantidad_disponible' => 'decimal:4',
            'cantidad_danada' => 'decimal:4',
            'cantidad_perdida' => 'decimal:4',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'almacen_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'producto_id');
    }
}
