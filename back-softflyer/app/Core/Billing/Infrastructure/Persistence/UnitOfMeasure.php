<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use Illuminate\Database\Eloquent\Model;

/** Catalogo SUNAT N.° 03, global y sin RLS. */
class UnitOfMeasure extends Model
{
    public $timestamps = false;

    protected $table = 'unidades_medida';

    protected function casts(): array
    {
        return ['es_activo' => 'boolean'];
    }
}
