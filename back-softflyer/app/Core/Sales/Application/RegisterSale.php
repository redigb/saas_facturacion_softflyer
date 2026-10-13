<?php

namespace App\Core\Sales\Application;

use App\Core\Cash\Infrastructure\Persistence\CashSession;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Sales\Infrastructure\Persistence\Payment;
use App\Core\Sales\Infrastructure\Persistence\Sale;
use App\Shared\Domain\Money;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Registra una venta ya cobrada dentro de un turno de caja (spec 009, Doc. 08 §9).
 * No conoce los pedidos: quien cobra le pasa las líneas y los pagos. Debe llamarse
 * dentro de la transacción de quien cobra, para que venta y cierre del pedido vayan juntos.
 */
final class RegisterSale
{
    /** IGV incluido en los precios de la carta. Todo se vende gravado hasta tener afectación por producto. */
    private const IGV_RATE_PERCENT = 18;

    /**
     * @param  list<array{producto_id: int, descripcion: string, cantidad: string, total: string}>  $lines  `total` ya incluye IGV
     * @param  list<array{metodo_pago_id: int, monto: string, monto_recibido?: ?string, referencia?: ?string}>  $payments
     */
    public function handle(User $cashier, CashSession $session, int $branchId, array $lines, array $payments): Sale
    {
        $lines = array_values($lines);
        $methods = DB::table('metodos_pago')->whereIn('id', array_column($payments, 'metodo_pago_id'))->get()->keyBy('id');
        $rows = $this->paymentRows($payments, $methods);

        $lineTotals = array_map(fn (array $line) => Money::cents($line['total']), $lines);
        $total = array_sum($lineTotals);
        $paid = array_sum(array_column($rows, 'monto'));

        if ($paid !== $total) {
            throw new BusinessException(
                'PAGO_NO_CUBRE_TOTAL',
                $paid < $total ? 'Los pagos no cubren el total de la cuenta.' : 'Los pagos superan el total de la cuenta.',
                422,
                ['total' => Money::format($total), 'pagado' => Money::format($paid), 'falta' => Money::format($total - $paid)],
            );
        }

        $igvByLine = array_map(fn (int $cents) => $cents - intdiv($cents * 100 + (100 + self::IGV_RATE_PERCENT) / 2, 100 + self::IGV_RATE_PERCENT), $lineTotals);
        $igv = array_sum($igvByLine);

        $sale = Sale::create([
            'sucursal_id' => $branchId,
            'sesion_caja_id' => $session->id,
            'usuario_id' => $cashier->id,
            'op_gravada' => Money::format($total - $igv),
            'igv' => Money::format($igv),
            'total' => Money::format($total),
            'estado' => Sale::ISSUED,
        ]);

        foreach (array_values($lines) as $index => $line) {
            $cents = $lineTotals[$index];
            $quantity = (float) $line['cantidad'];

            DB::table('detalle_ventas')->insert([
                'inquilino_id' => $sale->inquilino_id,
                'venta_id' => $sale->id,
                'producto_id' => $line['producto_id'],
                'descripcion' => mb_substr($line['descripcion'], 0, 200),
                'cantidad' => $line['cantidad'],
                'precio_unitario' => Money::format((int) round($cents / ($quantity > 0 ? $quantity : 1))),
                'igv' => Money::format($igvByLine[$index]),
                'total' => Money::format($cents),
            ]);
        }

        foreach ($rows as $row) {
            Payment::create([
                'venta_id' => $sale->id,
                'sesion_caja_id' => $session->id,
                'metodo_pago_id' => $row['metodo_pago_id'],
                'monto' => Money::format($row['monto']),
                'monto_recibido' => $row['monto_recibido'] === null ? null : Money::format($row['monto_recibido']),
                'vuelto' => Money::format($row['vuelto']),
                'referencia' => $row['referencia'],
            ]);
        }

        return $sale->load('payments');
    }

    /**
     * @param  list<array<string, mixed>>  $payments
     * @return list<array{metodo_pago_id: int, monto: int, monto_recibido: ?int, vuelto: int, referencia: ?string}>
     */
    private function paymentRows(array $payments, $methods): array
    {
        $errors = [];
        $rows = [];

        foreach (array_values($payments) as $index => $payment) {
            $method = $methods->get($payment['metodo_pago_id']);
            $amount = Money::cents($payment['monto']);

            if ($method === null || ! $method->es_activo) {
                $errors["pagos.{$index}.metodo_pago_id"] = ['Este método de pago no está disponible.'];

                continue;
            }
            if ($amount <= 0) {
                $errors["pagos.{$index}.monto"] = ['El monto debe ser mayor a cero.'];

                continue;
            }

            $received = null;
            $change = 0;
            if ($method->es_efectivo) {
                $received = isset($payment['monto_recibido']) ? Money::cents($payment['monto_recibido']) : $amount;
                if ($received < $amount) {
                    $errors["pagos.{$index}.monto_recibido"] = ['El efectivo recibido no alcanza para este pago.'];

                    continue;
                }
                $change = $received - $amount;
            }

            $rows[] = [
                'metodo_pago_id' => (int) $method->id,
                'monto' => $amount,
                'monto_recibido' => $received,
                'vuelto' => $change,
                'referencia' => isset($payment['referencia']) && trim((string) $payment['referencia']) !== '' ? trim((string) $payment['referencia']) : null,
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $rows;
    }
}
