<?php

namespace App\Core\Tenancy\Application;

use Illuminate\Support\Facades\DB;

/**
 * Qué IGV aplica en una sucursal. La tasa de la sucursal pisa la de la empresa (18 % si ninguna eligió otra) y una
 * sucursal de la Amazonía vende exonerado lo gravado, con la leyenda 2001 (bienes) o 2002 (servicios).
 * Lo inafecto y lo gratuito nunca cambian. Lo fija solo el backoffice.
 */
final class BranchIgvPolicy
{
    public const DEFAULT_PERCENT = 18.0;

    public const GRAVADO = '10';

    public const EXONERADO = '20';

    /** Porcentaje de IGV de la sucursal. */
    public function percent(int $branchId): float
    {
        $rate = DB::table('sucursales')
            ->join('empresas', 'empresas.id', '=', 'sucursales.empresa_id')
            ->leftJoin('tasas_igv', 'tasas_igv.id', '=', DB::raw('COALESCE(sucursales.tasa_igv_id, empresas.tasa_igv_id)'))
            ->where('sucursales.id', $branchId)
            ->value('tasas_igv.tasa');

        return $rate === null ? self::DEFAULT_PERCENT : (float) $rate;
    }

    /** Leyenda de la Amazonía (2001 o 2002) si la sucursal está exonerada por ese motivo; nulo si no. */
    public function amazoniaLegend(int $branchId): ?string
    {
        $branch = DB::table('sucursales')->where('id', $branchId)->first(['exonerado_amazonia', 'leyenda_amazonia']);

        return $branch !== null && $branch->exonerado_amazonia ? $branch->leyenda_amazonia : null;
    }

    /** Afectación (catálogo 07) con la que se vende un producto en la sucursal: solo lo gravado pasa a exonerado. */
    public function affectation(string $productCode, bool $amazonia): string
    {
        return $amazonia && $productCode === self::GRAVADO ? self::EXONERADO : $productCode;
    }
}
