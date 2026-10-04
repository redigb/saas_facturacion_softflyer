<?php

namespace App\Core\Tenancy\Domain;

/**
 * RUC peruano: 11 digitos, prefijo valido y digito verificador modulo 11 (SUNAT).
 */
final class Ruc
{
    private const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    private const PREFIXES = ['10', '15', '17', '20'];

    public static function isValid(string $ruc): bool
    {
        if (! preg_match('/^\d{11}$/', $ruc) || ! in_array(substr($ruc, 0, 2), self::PREFIXES, true)) {
            return false;
        }

        $sum = 0;
        foreach (self::WEIGHTS as $i => $weight) {
            $sum += (int) $ruc[$i] * $weight;
        }

        $check = 11 - ($sum % 11);
        $check = match ($check) {
            10 => 0,
            11 => 1,
            default => $check,
        };

        return (int) $ruc[10] === $check;
    }
}
