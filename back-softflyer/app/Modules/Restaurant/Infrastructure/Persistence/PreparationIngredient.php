<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class PreparationIngredient extends BaseModel
{
    use BelongsToTenant;

    public const CREATED_AT = null;

    public const UPDATED_AT = null;

    protected $table = 'ingredientes_preparacion';

    public function preparation(): BelongsTo
    {
        return $this->belongsTo(DishPreparation::class, 'ficha_preparacion_id');
    }
}
