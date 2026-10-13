<?php

namespace App\Core\Billing\Presentation;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Forma del contrato de specs/010-comprobante-simulado/backend.md. */
final class ReceiptPresenter
{
    private const TYPES = ['01' => 'FACTURA', '03' => 'BOLETA'];

    private const DOCUMENTS = ['-' => 'SIN_DOCUMENTO', '1' => 'DNI', '6' => 'RUC'];

    /** @param  Collection<int, Receipt>  $receipts */
    public function many(Collection $receipts): array
    {
        if ($receipts->isEmpty()) {
            return [];
        }

        $types = DB::table('tipos_comprobante')->whereIn('id', $receipts->pluck('tipo_comprobante_id'))->pluck('codigo', 'id');
        $companies = DB::table('empresas')->whereIn('id', $receipts->pluck('empresa_id'))->get()->keyBy('id');
        $lines = DB::table('detalle_ventas')->whereIn('venta_id', $receipts->pluck('venta_id'))->orderBy('id')->get()->groupBy('venta_id');
        $payments = DB::table('pagos')
            ->join('metodos_pago', 'metodos_pago.id', '=', 'pagos.metodo_pago_id')
            ->whereIn('pagos.venta_id', $receipts->pluck('venta_id'))
            ->orderBy('pagos.id')
            ->get(['pagos.venta_id', 'pagos.monto', 'metodos_pago.nombre'])
            ->groupBy('venta_id');

        return $receipts->map(function (Receipt $receipt) use ($types, $companies, $lines, $payments) {
            $company = $companies->get($receipt->empresa_id);

            return [
                'id' => $receipt->id,
                'venta_id' => $receipt->venta_id,
                'tipo' => self::TYPES[$types[$receipt->tipo_comprobante_id] ?? ''] ?? 'COMPROBANTE',
                'serie' => $receipt->serie,
                'correlativo' => $receipt->correlativo,
                'numero' => sprintf('%s-%08d', $receipt->serie, $receipt->correlativo),
                'estado' => $receipt->estado,
                'es_simulado' => $receipt->es_simulado,
                'emitido_en' => $receipt->emitido_en->utc()->toIso8601ZuluString(),
                'empresa' => [
                    'razon_social' => $company?->razon_social,
                    'ruc' => $company?->ruc,
                    'nombre_comercial' => $company?->nombre_comercial,
                    'direccion' => $company?->direccion_fiscal,
                ],
                'cliente' => [
                    'tipo_documento' => self::DOCUMENTS[$receipt->cliente_tipo_documento] ?? 'SIN_DOCUMENTO',
                    'numero' => $receipt->cliente_numero_documento,
                    'nombre' => $receipt->cliente_nombre,
                ],
                'op_gravada' => $receipt->op_gravada,
                'igv' => $receipt->igv,
                'total' => $receipt->total,
                'lineas' => ($lines[$receipt->venta_id] ?? collect())->map(fn ($line) => [
                    'descripcion' => $line->descripcion,
                    'cantidad' => $line->cantidad,
                    'precio_unitario' => $line->precio_unitario,
                    'total' => $line->total,
                ])->values()->all(),
                'pagos' => ($payments[$receipt->venta_id] ?? collect())->map(fn ($payment) => [
                    'metodo' => $payment->nombre,
                    'monto' => $payment->monto,
                ])->values()->all(),
            ];
        })->values()->all();
    }

    public function one(Receipt $receipt): array
    {
        return $this->many(collect([$receipt]))[0];
    }
}
