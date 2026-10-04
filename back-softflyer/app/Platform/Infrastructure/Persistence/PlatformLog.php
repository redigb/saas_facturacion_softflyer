<?php

namespace App\Platform\Infrastructure\Persistence;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformLog extends Model
{
    public const UPDATED_AT = null;

    public const CREATED_AT = 'creado_en';

    protected $table = 'bitacora_plataforma';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['detalle' => 'array'];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'administrador_id');
    }
}
