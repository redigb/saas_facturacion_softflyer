<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class DiningTable extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'mesas';
}
