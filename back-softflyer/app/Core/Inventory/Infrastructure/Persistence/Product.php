<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Billing\Infrastructure\Persistence\IgvAffectationType;
use App\Core\Billing\Infrastructure\Persistence\UnitOfMeasure;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'productos';

    protected static function booted(): void
    {
        // Compatibilidad: los flujos anteriores solo marcaban controla_stock.
        static::saving(function (Product $product): void {
            if (! $product->controla_stock) {
                return;
            }

            $product->categoria_inventario ??= $product->tipo === 'BEBIDA' ? 'BEBIDA' : 'ALIMENTO';
            $product->naturaleza_inventario ??= 'CONSUMIBLE';
        });
    }

    protected function casts(): array
    {
        return [
            'precio_venta' => 'decimal:2',
            'es_vendible' => 'boolean',
            'controla_stock' => 'boolean',
            'es_activo' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'categoria_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'unidad_medida_id');
    }

    public function igvAffectation(): BelongsTo
    {
        return $this->belongsTo(IgvAffectationType::class, 'tipo_afectacion_igv_id');
    }
}
