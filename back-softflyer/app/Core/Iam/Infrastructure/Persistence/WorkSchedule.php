<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkSchedule extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'horarios_trabajo';

    protected function casts(): array
    {
        return [
            'dias_semana' => 'array',
            'tolerancia_minutos' => 'integer',
            'es_activo' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'sucursal_id');
    }
}
