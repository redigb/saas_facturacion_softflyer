<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'empresas';

    protected $hidden = ['clave_sol_cifrada'];

    protected function casts(): array
    {
        return ['homologado' => 'boolean', 'aplica_tasa_reducida' => 'boolean'];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class, 'empresa_id');
    }
}
