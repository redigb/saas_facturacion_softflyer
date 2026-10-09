<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'categorias';

    protected function casts(): array
    {
        return ['es_activa' => 'boolean'];
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'categoria_id');
    }
}
