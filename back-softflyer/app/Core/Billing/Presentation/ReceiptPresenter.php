<?php

namespace App\Core\Billing\Presentation;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Shared\Domain\AmountInWords;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Forma del contrato de specs/010-comprobante-simulado/backend.md. */
final class ReceiptPresenter
{
    private const TYPES = ['01' => 'FACTURA', '03' => 'BOLETA'];

    private const DOCUMENTS = ['-' => 'SIN_DOCUMENTO', '1' => 'DNI', '6' => 'RUC'];

    private const PRINTED = ['01' => 'FACTURA ELECTRÓNICA', '03' => 'BOLETA DE VENTA ELECTRÓNICA'];

    /** Mismo código que el XML (catálogo 06): sin documento va como «0». */
    private const QR_DOCUMENTS = ['-' => '0', '1' => '1', '6' => '6'];

    /** @param  Collection<int, Receipt>  $receipts */
    public function many(Collection $receipts): array
    {
        if ($receipts->isEmpty()) {
            return [];
        }

        $types = DB::table('tipos_comprobante')->whereIn('id', $receipts->pluck('tipo_comprobante_id'))->pluck('codigo', 'id');
        $branches = DB::table('sucursales')->whereIn('id', $receipts->pluck('sucursal_id'))->pluck('nombre', 'id');
        $companies = DB::table('empresas')->whereIn('id', $receipts->pluck('empresa_id'))->get()->keyBy('id');
        $lines = DB::table('detalle_ventas')->whereIn('venta_id', $receipts->pluck('venta_id'))->orderBy('id')->get()->groupBy('venta_id');
        $payments = DB::table('pagos')
            ->join('metodos_pago', 'metodos_pago.id', '=', 'pagos.metodo_pago_id')
            ->whereIn('pagos.venta_id', $receipts->pluck('venta_id'))
            ->orderBy('pagos.id')
            ->get(['pagos.venta_id', 'pagos.monto', 'metodos_pago.nombre'])
            ->groupBy('venta_id');

        return $receipts->map(function (Receipt $receipt) use ($types, $branches, $companies, $lines, $payments) {
            $company = $companies->get($receipt->empresa_id);
            $typeCode = $types[$receipt->tipo_comprobante_id] ?? '';
            $real = ! $receipt->es_simulado;

            return [
                'id' => $receipt->id,
                'venta_id' => $receipt->venta_id,
                'tipo' => self::TYPES[$typeCode] ?? 'COMPROBANTE',
                'serie' => $receipt->serie,
                'correlativo' => $receipt->correlativo,
                'numero' => sprintf('%s-%08d', $receipt->serie, $receipt->correlativo),
                'estado' => $receipt->estado,
                'es_simulado' => $receipt->es_simulado,
                'emitido_en' => $receipt->emitido_en->utc()->toIso8601ZuluString(),
                'sucursal' => $branches[$receipt->sucursal_id] ?? null,
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
                'op_exonerada' => $receipt->op_exonerada,
                'op_inafecta' => $receipt->op_inafecta,
                'igv' => $receipt->igv,
                'total' => $receipt->total,
                'importe_en_letras' => AmountInWords::soles((string) $receipt->total),
                'leyenda' => Receipt::AMAZONIA_LEGENDS[$receipt->leyenda_codigo] ?? null,
                // Spec 037: lo que hace del ticket una representación impresa válida.
                'representacion_impresa' => $real && isset(self::PRINTED[$typeCode]) ? 'Representación impresa de la '.self::PRINTED[$typeCode] : null,
                'hash' => $real ? $receipt->hash_firma : null,
                'qr' => $real && $receipt->hash_firma !== null ? $this->qr($receipt, $typeCode, (string) $company?->ruc) : null,
                'mensaje_sunat' => $receipt->mensaje_respuesta_sunat,
                'tiene_xml' => $receipt->ruta_xml !== null,
                'tiene_cdr' => $receipt->ruta_cdr !== null,
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

    /** Contenido del QR de SUNAT: RUC|tipo|serie|número|IGV|total|fecha|tipo doc|número doc|hash| */
    private function qr(Receipt $receipt, string $typeCode, string $ruc): string
    {
        return implode('|', [
            $ruc,
            $typeCode,
            $receipt->serie,
            $receipt->correlativo,
            $receipt->igv,
            $receipt->total,
            $receipt->emitido_en->copy()->setTimezone(Receipt::TIMEZONE)->toDateString(),
            self::QR_DOCUMENTS[$receipt->cliente_tipo_documento] ?? '0',
            $receipt->cliente_numero_documento ?? '0',
            $receipt->hash_firma,
        ]).'|';
    }

    public function one(Receipt $receipt): array
    {
        return $this->many(collect([$receipt]))[0];
    }
}
