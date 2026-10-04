<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;

// Global: los planes del SaaS no pertenecen a ningun inquilino.
class Plan extends BaseModel
{
    protected $table = 'planes';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['modulos_incluidos' => 'array', 'es_activo' => 'boolean'];
    }
}
