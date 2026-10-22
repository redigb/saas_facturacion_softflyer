<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'almacenes';

    protected function casts(): array
    {
        return ['es_principal' => 'boolean', 'es_activo' => 'boolean'];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'sucursal_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class, 'almacen_id');
    }
}
