<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiningRoom extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'salones';

    public function tables(): HasMany
    {
        return $this->hasMany(DiningTable::class, 'salon_id');
    }

    public function elements(): HasMany
    {
        return $this->hasMany(FloorElement::class, 'salon_id');
    }
}
