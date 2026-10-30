<?php

namespace App\Core\Billing\Application;

use App\Core\Billing\Infrastructure\Jobs\SendReceiptJob;
use App\Core\Billing\Infrastructure\Persistence\DocumentSeries;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Sales\Infrastructure\Persistence\Sale;
use App\Core\Tenancy\Application\BranchIgvPolicy;
use App\Core\Tenancy\Domain\Ruc;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Emite el comprobante de una venta (spec 010 y 017b). Numera y guarda al instante; si la
 * empresa ya tiene certificado y SOL, el comprobante queda PENDIENTE_ENVIO y un Job lo firma
 * y lo manda a SUNAT sin hacer esperar al cajero. Sin configuración fiscal sigue siendo una
 * simulación (`es_simulado`) que nunca sale hacia SUNAT.
 *
 * Debe llamarse dentro de la transacción del cobro.
 */
final class IssueReceipt
{
    /** Desde este total (S/) SUNAT exige identificar al comprador de una boleta. */
    private const IDENTIFIED_BOLETA_FROM = 700;

    public function __construct(
        private readonly ManageFiscalConfiguration $fiscal,
        private readonly BranchIgvPolicy $igvPolicy,
        private readonly SunatGateway $sunat,
    ) {}

    public const INVOICE = '01';

    public const RECEIPT = '03';

    private const DOCUMENT_CODES = ['DNI' => '1', 'RUC' => '6'];

    /**
     * @param  array{tipo_documento?: ?string, numero?: ?string, nombre?: ?string}|null  $customer
     */
    public function handle(Sale $sale, ?array $customer): Receipt
    {
        $real = $this->fiscal->status()['listo_para_emitir'];
        $customer = $this->customer($customer);
        if ($real && $customer['tipo_documento'] === '-' && (float) $sale->total >= self::IDENTIFIED_BOLETA_FROM) {
            throw ValidationException::withMessages(['cliente.numero' => ['Desde S/ 700 la boleta lleva el DNI del cliente.']]);
        }
        $typeCode = $customer['tipo_documento'] === '6' ? self::INVOICE : self::RECEIPT;

        $typeId = (int) DB::table('tipos_comprobante')->where('codigo', $typeCode)->value('id');
        $companyId = (int) DB::table('sucursales')->where('id', $sale->sucursal_id)->value('empresa_id');

        $series = $this->lockedSeries($companyId, $sale->sucursal_id, $typeId, $typeCode);
        $number = $series->ultimo_correlativo + 1;
        $series->update(['ultimo_correlativo' => $number]);

        $receipt = Receipt::create([
            'empresa_id' => $companyId,
            'sucursal_id' => $sale->sucursal_id,
            'venta_id' => $sale->id,
            'tipo_comprobante_id' => $typeId,
            'serie' => $series->serie,
            'correlativo' => $number,
            'cliente_tipo_documento' => $customer['tipo_documento'],
            'cliente_numero_documento' => $customer['numero'],
            'cliente_nombre' => $customer['nombre'],
            'op_gravada' => $sale->op_gravada,
            'op_exonerada' => $sale->op_exonerada,
            'op_inafecta' => $sale->op_inafecta,
            'igv' => $sale->igv,
            'total' => $sale->total,
            // La leyenda de la Amazonía va solo si hay algo exonerado; queda fija aunque la sucursal cambie después.
            'leyenda_codigo' => (float) $sale->op_exonerada > 0 ? $this->igvPolicy->amazoniaLegend($sale->sucursal_id) : null,
            'estado' => $real ? Receipt::PENDING : Receipt::ISSUED,
            'es_simulado' => ! $real,
            'emitido_en' => now(),
        ]);

        $this->copyLines($sale, $receipt);

        if ($real) {
            $this->sign($receipt);
            SendReceiptJob::dispatch((int) $receipt->inquilino_id, $receipt->id)->afterCommit();
        }

        return $receipt;
    }

    /**
     * El hash va impreso en el ticket (spec 037): se firma ya, sin internet, para imprimir aunque
     * SUNAT esté caída. Si la firma falla el cobro sigue; el Job firma de nuevo al enviar.
     */
    private function sign(Receipt $receipt): void
    {
        try {
            // Punto de guardado: un error de SQL aquí no debe abortar la transacción del cobro.
            DB::transaction(fn () => $receipt->update(['hash_firma' => $this->sunat->sign($receipt)]));
        } catch (Throwable $e) {
            report($e);
        }
    }

    /** El detalle viaja con el comprobante: lo que se firma no cambia aunque la carta cambie después. */
    private function copyLines(Sale $sale, Receipt $receipt): void
    {
        $rate = 1 + $this->igvPolicy->percent($receipt->sucursal_id) / 100;
        $affectation = DB::table('tipos_afectacion_igv')->pluck('codigo', 'id');

        $rows = DB::table('detalle_ventas')->where('venta_id', $sale->id)->orderBy('id')->get()->map(function ($line) use ($receipt, $affectation) {
            $taxed = ($affectation[$line->tipo_afectacion_igv_id] ?? '10') === '10';
            $quantity = (float) $line->cantidad > 0 ? (float) $line->cantidad : 1.0;
            $value = (float) $line->total - (float) $line->igv;

            return [
                'inquilino_id' => $receipt->inquilino_id,
                'comprobante_id' => $receipt->id,
                'producto_id' => $line->producto_id,
                'descripcion' => $line->descripcion,
                'unidad_medida' => 'NIU',
                'cantidad' => $line->cantidad,
                'valor_unitario' => round($value / $quantity, 6),
                'precio_unitario' => round((float) $line->total / $quantity, 6),
                'tipo_afectacion_igv_id' => $line->tipo_afectacion_igv_id ?? DB::table('tipos_afectacion_igv')->where('codigo', '10')->value('id'),
                'valor_venta' => round($value, 2),
                'igv' => $line->igv,
                'total' => $line->total,
                'creado_en' => now(),
                'actualizado_en' => now(),
            ];
        })->all();

        DB::table('detalle_comprobantes')->insert($rows);
    }

    /** @return array{tipo_documento: string, numero: ?string, nombre: string} */
    private function customer(?array $input): array
    {
        $type = $input['tipo_documento'] ?? null;
        $number = isset($input['numero']) ? trim((string) $input['numero']) : '';
        $name = isset($input['nombre']) ? trim((string) $input['nombre']) : '';

        if ($type === null || $number === '') {
            return ['tipo_documento' => '-', 'numero' => null, 'nombre' => 'CLIENTES VARIOS'];
        }

        if ($type === 'RUC') {
            $errors = [];
            if (! Ruc::isValid($number)) {
                $errors['cliente.numero'] = ['El RUC no es válido. Revísalo e inténtalo de nuevo.'];
            }
            if ($name === '') {
                $errors['cliente.nombre'] = ['Escribe la razón social para emitir la factura.'];
            }
            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }
        } elseif (! preg_match('/^\d{8}$/', $number)) {
            throw ValidationException::withMessages(['cliente.numero' => ['El DNI debe tener 8 dígitos.']]);
        }

        return [
            'tipo_documento' => self::DOCUMENT_CODES[$type],
            'numero' => $number,
            'nombre' => $name !== '' ? mb_substr($name, 0, 200) : 'CLIENTES VARIOS',
        ];
    }

    /** La serie de la sucursal para ese tipo, bloqueada; se crea la primera vez. */
    private function lockedSeries(int $companyId, int $branchId, int $typeId, string $typeCode): DocumentSeries
    {
        $series = DocumentSeries::where('sucursal_id', $branchId)
            ->where('tipo_comprobante_id', $typeId)
            ->where('es_activa', true)
            ->orderBy('id')
            ->lockForUpdate()
            ->first();

        if ($series !== null) {
            return $series;
        }

        // SUNAT exige series únicas por RUC: se toma la primera libre (B001, B002, …).
        $prefix = $typeCode === self::INVOICE ? 'F' : 'B';
        $taken = DocumentSeries::where('empresa_id', $companyId)->where('tipo_comprobante_id', $typeId)->pluck('serie')->all();
        $next = 1;
        while (in_array(sprintf('%s%03d', $prefix, $next), $taken, true)) {
            $next++;
        }

        return DocumentSeries::create([
            'empresa_id' => $companyId,
            'sucursal_id' => $branchId,
            'tipo_comprobante_id' => $typeId,
            'serie' => sprintf('%s%03d', $prefix, $next),
            'ultimo_correlativo' => 0,
            'es_activa' => true,
        ])->refresh();
    }
}
