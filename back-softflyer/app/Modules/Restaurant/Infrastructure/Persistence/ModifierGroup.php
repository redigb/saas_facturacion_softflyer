<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModifierGroup extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'modificador_grupos';

    public function modifiers(): HasMany
    {
        return $this->hasMany(Modifier::class, 'modificador_grupo_id')->orderBy('orden')->orderBy('id');
    }
}
