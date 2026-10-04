<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'productos';

    protected function casts(): array
    {
        return ['es_vendible' => 'boolean', 'controla_stock' => 'boolean', 'es_activo' => 'boolean'];
    }
}
