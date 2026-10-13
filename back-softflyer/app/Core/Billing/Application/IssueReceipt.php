<?php

namespace App\Core\Billing\Application;

use App\Core\Billing\Infrastructure\Persistence\DocumentSeries;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Sales\Infrastructure\Persistence\Sale;
use App\Core\Tenancy\Domain\Ruc;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Emite el comprobante de una venta (spec 010). Hoy es una SIMULACIÓN: numera y guarda,
 * sin XML, firma ni SUNAT. Al integrar Greenter este es el único punto que cambia
 * (Doc. 04): la emisión pasará a una cola y el cobro seguirá sin esperarla.
 *
 * Debe llamarse dentro de la transacción del cobro.
 */
final class IssueReceipt
{
    public const INVOICE = '01';

    public const RECEIPT = '03';

    private const DOCUMENT_CODES = ['DNI' => '1', 'RUC' => '6'];

    /**
     * @param  array{tipo_documento?: ?string, numero?: ?string, nombre?: ?string}|null  $customer
     */
    public function handle(Sale $sale, ?array $customer): Receipt
    {
        $customer = $this->customer($customer);
        $typeCode = $customer['tipo_documento'] === '6' ? self::INVOICE : self::RECEIPT;

        $typeId = (int) DB::table('tipos_comprobante')->where('codigo', $typeCode)->value('id');
        $companyId = (int) DB::table('sucursales')->where('id', $sale->sucursal_id)->value('empresa_id');

        $series = $this->lockedSeries($companyId, $sale->sucursal_id, $typeId, $typeCode);
        $number = $series->ultimo_correlativo + 1;
        $series->update(['ultimo_correlativo' => $number]);

        return Receipt::create([
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
            'igv' => $sale->igv,
            'total' => $sale->total,
            'estado' => Receipt::ISSUED,
            'es_simulado' => true,
            'emitido_en' => now(),
        ]);
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
