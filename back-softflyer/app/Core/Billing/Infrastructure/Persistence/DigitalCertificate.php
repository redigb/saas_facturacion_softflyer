<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

class DigitalCertificate extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'certificados_digitales';

    protected $hidden = ['pem_cifrado'];

    protected function casts(): array
    {
        return ['vence_en' => 'date', 'es_activo' => 'boolean'];
    }
}
