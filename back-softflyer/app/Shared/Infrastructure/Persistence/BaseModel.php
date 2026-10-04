<?php

namespace App\Shared\Infrastructure\Persistence;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo base con las marcas de tiempo en espanol (Doc. 02 §14).
 */
abstract class BaseModel extends Model
{
    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    public const DELETED_AT = 'eliminado_en';

    protected $guarded = ['id', 'inquilino_id'];
}
