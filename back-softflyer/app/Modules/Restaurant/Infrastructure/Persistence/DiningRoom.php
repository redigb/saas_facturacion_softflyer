<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiningRoom extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'salones';

    protected function casts(): array
    {
        return ['ancho' => 'integer', 'alto' => 'integer', 'orden' => 'integer', 'version' => 'integer', 'es_activo' => 'boolean'];
    }

    /** Todas las mesas, tambien las retiradas del plano (tienen historial). */
    public function tables(): HasMany
    {
        return $this->hasMany(DiningTable::class, 'salon_id');
    }

    public function activeTables(): HasMany
    {
        return $this->tables()->where('es_activa', true);
    }

    public function elements(): HasMany
    {
        return $this->hasMany(FloorElement::class, 'salon_id');
    }
}
