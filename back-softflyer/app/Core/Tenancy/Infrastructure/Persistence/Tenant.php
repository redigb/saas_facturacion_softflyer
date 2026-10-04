<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Core\Tenancy\Domain\AccountMode;
use App\Core\Tenancy\Domain\TenantStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $table = 'inquilinos';

    protected $fillable = ['slug', 'nombre', 'estado', 'es_demo'];

    protected function casts(): array
    {
        return [
            'estado' => TenantStatus::class,
            'es_demo' => 'boolean',
        ];
    }

    public function mode(): AccountMode
    {
        return AccountMode::for($this->es_demo, $this->estado);
    }

    public function currentSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class, 'inquilino_id')->latestOfMany();
    }

    /**
     * Estado de la prueba gratis; nulo si la cuenta no esta en prueba.
     *
     * @return array{vence_en: string, dias_restantes: int, vencida: bool}|null
     */
    public function trial(): ?array
    {
        $subscription = $this->currentSubscription;

        if ($this->mode() !== AccountMode::Trial || $subscription === null) {
            return null;
        }

        $endsOn = $subscription->fecha_vencimiento;

        return [
            'vence_en' => $endsOn->toDateString(),
            'dias_restantes' => max(0, (int) today()->diffInDays($endsOn, false)),
            'vencida' => today()->greaterThan($endsOn),
        ];
    }
}
