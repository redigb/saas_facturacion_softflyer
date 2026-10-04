<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class DocumentSeries extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'series_comprobante';
}
