<?php

namespace App\Shared\Domain;

/** Importe en letras para la leyenda 1000 de SUNAT: «SON CIENTO DIECIOCHO CON 00/100 SOLES». */
final class AmountInWords
{
    private const UNITS = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];

    private const TENS = [3 => 'TREINTA', 4 => 'CUARENTA', 5 => 'CINCUENTA', 6 => 'SESENTA', 7 => 'SETENTA', 8 => 'OCHENTA', 9 => 'NOVENTA'];

    private const HUNDREDS = [1 => 'CIENTO', 2 => 'DOSCIENTOS', 3 => 'TRESCIENTOS', 4 => 'CUATROCIENTOS', 5 => 'QUINIENTOS', 6 => 'SEISCIENTOS', 7 => 'SETECIENTOS', 8 => 'OCHOCIENTOS', 9 => 'NOVECIENTOS'];

    public static function soles(string $amount): string
    {
        $cents = Money::cents($amount);
        $whole = intdiv($cents, 100);

        return sprintf('SON %s CON %02d/100 SOLES', $whole === 0 ? 'CERO' : self::words($whole), $cents % 100);
    }

    private static function words(int $n): string
    {
        if ($n >= 1_000_000) {
            $millions = intdiv($n, 1_000_000);
            $rest = $n % 1_000_000;

            return trim(($millions === 1 ? 'UN MILLON' : self::words($millions).' MILLONES').' '.($rest ? self::words($rest) : ''));
        }
        if ($n >= 1000) {
            $thousands = intdiv($n, 1000);
            $rest = $n % 1000;

            return trim(($thousands === 1 ? 'MIL' : self::words($thousands).' MIL').' '.($rest ? self::words($rest) : ''));
        }
        if ($n === 100) {
            return 'CIEN';
        }
        if ($n >= 100) {
            $rest = $n % 100;

            return trim(self::HUNDREDS[intdiv($n, 100)].' '.($rest ? self::words($rest) : ''));
        }
        if ($n < 30) {
            return self::UNITS[$n];
        }

        $unit = $n % 10;

        return self::TENS[intdiv($n, 10)].($unit ? ' Y '.self::UNITS[$unit] : '');
    }
}
