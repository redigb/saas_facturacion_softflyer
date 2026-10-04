<?php

namespace App\Core\Inventory\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'categorias';
}
