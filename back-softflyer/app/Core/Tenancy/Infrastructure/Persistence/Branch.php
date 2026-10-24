<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'sucursales';

    protected function casts(): array
    {
        return [
            'es_principal' => 'boolean',
            'es_activa' => 'boolean',
            'exonerado_amazonia' => 'boolean',
            'latitud' => 'float',
            'longitud' => 'float',
            'radio_geocerca_metros' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'empresa_id');
    }
}
