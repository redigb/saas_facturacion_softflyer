<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceMark extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'marcaciones_asistencia';

    protected function casts(): array
    {
        return [
            'marcado_en' => 'immutable_datetime',
            'latitud' => 'float',
            'longitud' => 'float',
            'precision_metros' => 'float',
            'distancia_metros' => 'float',
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
