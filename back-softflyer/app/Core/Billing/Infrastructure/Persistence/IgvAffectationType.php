<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use Illuminate\Database\Eloquent\Model;

/** Catalogo SUNAT N.° 07, global y sin RLS. */
class IgvAffectationType extends Model
{
    public $timestamps = false;

    protected $table = 'tipos_afectacion_igv';

    protected function casts(): array
    {
        return ['es_activo' => 'boolean'];
    }
}
