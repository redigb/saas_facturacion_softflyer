<?php

namespace App\Modules\Restaurant\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;
use Carbon\CarbonInterface;

/** Promoción de precio de la carta (spec 039). */
class Promotion extends BaseModel
{
    use BelongsToTenant;

    public const PERCENTAGE = 'PORCENTAJE';

    public const FIXED = 'PRECIO_FIJO';

    protected $table = 'promociones';

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'dias_semana' => 'array',
            'prioridad' => 'integer',
            'es_activa' => 'boolean',
            'desde' => 'datetime',
            'hasta' => 'datetime',
        ];
    }

    /** ¿La promoción se aplica en el instante indicado? Fechas en UTC, día y hora en Perú. */
    public function appliesAt(CarbonInterface $now): bool
    {
        if (! $this->es_activa || $now->lt($this->desde) || $now->gt($this->hasta)) {
            return false;
        }

        $local = $now->copy()->setTimezone(self::TIMEZONE);
        $days = $this->dias_semana;

        if (is_array($days) && $days !== [] && ! in_array($local->isoWeekday(), array_map('intval', $days), true)) {
            return false;
        }

        if ($this->hora_inicio !== null && $this->hora_fin !== null) {
            $time = $local->format('H:i:s');

            if ($time < $this->hora_inicio || $time > $this->hora_fin) {
                return false;
            }
        }

        return true;
    }

    /** Precio promocional para un precio de lista, o null si la promo no rebaja nada. */
    public function priceFor(float $original): ?float
    {
        $value = (float) $this->valor;
        $price = $this->tipo === self::PERCENTAGE
            ? round($original * (1 - $value / 100), 2)
            : round($value, 2);

        return $price > 0 && $price < $original ? $price : null;
    }

    private const TIMEZONE = 'America/Lima';
}
