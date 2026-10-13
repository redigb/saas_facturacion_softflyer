<?php

namespace App\Core\Cash\Infrastructure\Persistence;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Turno de una caja: de la apertura al arqueo (Doc. 08 §10). */
class CashSession extends BaseModel
{
    use BelongsToTenant;

    public const OPEN = 'ABIERTA';

    public const CLOSED = 'CERRADA';

    protected $table = 'sesiones_caja';

    protected function casts(): array
    {
        return [
            'abierta_en' => 'datetime',
            'cerrada_en' => 'datetime',
            'monto_apertura' => 'decimal:2',
            'monto_cierre_declarado' => 'decimal:2',
            'monto_cierre_calculado' => 'decimal:2',
        ];
    }

    public function register(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'caja_id');
    }

    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'abierta_por')->withTrashed();
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class, 'sesion_caja_id')->orderBy('id');
    }
}
