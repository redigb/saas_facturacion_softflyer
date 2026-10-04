<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class Role extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'roles';
}
