<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class DishPreparation extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'fichas_preparacion';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'producto_id');
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(PreparationIngredient::class, 'ficha_preparacion_id')->orderBy('orden');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actualizado_por');
    }
}
