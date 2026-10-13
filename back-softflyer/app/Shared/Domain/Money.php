<?php

namespace App\Shared\Domain;

/**
 * Montos como enteros en céntimos: sumar y comparar sin errores de coma flotante.
 * Solo traduce entre el texto "12.50" del contrato y los céntimos.
 */
final class Money
{
    public static function cents(string|int|float|null $amount): int
    {
        return (int) round(((float) ($amount ?? 0)) * 100);
    }

    public static function format(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
