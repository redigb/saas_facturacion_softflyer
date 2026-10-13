<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Cash\Application\ManageCashSessions;
use App\Core\Billing\Application\IssueReceipt;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Cash\Infrastructure\Persistence\CashSession;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Sales\Application\RegisterSale;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Shared\Domain\Money;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Cobro de un pedido en el turno del cajero (spec 009, Doc. 05 §2 y §7).
 * Un pedido puede cobrarse en varias ventas (cuenta dividida): cada una cubre un
 * conjunto de platos y el pedido se cierra cuando ya no queda ninguno sin cobrar.
 */
final class ChargeOrder
{
    public function __construct(
        private readonly ManageCashSessions $cash,
        private readonly RegisterSale $sales,
        private readonly IssueReceipt $receipts,
        private readonly ManageOrders $orders,
        private readonly TenantContext $context,
    ) {}

    /**
     * @param  array{detalle_ids?: list<int>, version?: int, cliente?: ?array<string, mixed>, pagos: list<array<string, mixed>>}  $data
     * @return array{sale: \App\Core\Sales\Infrastructure\Persistence\Sale, receipt: Receipt, order: Order, change: string, pending: string}
     */
    public function handle(User $cashier, Order $order, array $data): array
    {
        $session = $this->cash->requireOpen($cashier);

        if ($order->sucursal_id !== $session->register->sucursal_id) {
            throw new AccessDeniedHttpException;
        }

        return DB::transaction(function () use ($cashier, $order, $data, $session) {
            // Bloquea el turno (que no se cierre a medio cobro) y el pedido (que no se cobre dos veces).
            $session = CashSession::with('register')->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if ($session->estado !== CashSession::OPEN) {
                throw new BusinessException('SESION_CERRADA', 'Este turno de caja ya está cerrado.');
            }

            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->estado !== Order::BILL_REQUESTED) {
                throw new BusinessException('PEDIDO_NO_COBRABLE', 'Este pedido no está esperando cobro.');
            }
            if (isset($data['version']) && (int) $data['version'] !== $order->version) {
                throw new BusinessException('CONFLICTO_VERSION', 'El pedido cambió mientras lo cobrabas. Revísalo e inténtalo de nuevo.', 409, ['version' => $order->version]);
            }

            $items = $this->unchargedItems($order);
            $selected = $this->select($order, $items, $data['detalle_ids'] ?? null);

            $sale = $this->sales->handle($cashier, $session, $order->sucursal_id, $selected->map(fn (OrderItem $item) => [
                'producto_id' => $item->producto_id,
                'descripcion' => $item->product?->nombre ?? 'Plato',
                'cantidad' => (string) $item->cantidad,
                'total' => $item->subtotal(),
            ])->all(), $data['pagos']);

            // Spec 010: el comprobante nace con la venta, en la misma transacción.
            $receipt = $this->receipts->handle($sale, $data['cliente'] ?? null);

            DB::table('venta_detalle_pedido')->insert($selected->map(fn (OrderItem $item) => [
                'inquilino_id' => $this->context->id(),
                'venta_id' => $sale->id,
                'detalle_pedido_id' => $item->id,
            ])->all());

            $remaining = $items->diff($selected);
            if ($remaining->isEmpty()) {
                $this->orders->close($order);
            } else {
                $order->update(['version' => $order->version + 1]);
            }

            return [
                'sale' => $sale,
                'receipt' => $receipt,
                'order' => $order,
                'change' => Money::format((int) $sale->payments->sum(fn ($payment) => Money::cents($payment->vuelto))),
                'pending' => Money::format($remaining->sum(fn (OrderItem $item) => Money::cents($item->subtotal()))),
            ];
        });
    }

    /** Platos vigentes del pedido que ninguna venta cubrió, por id. */
    private function unchargedItems(Order $order): \Illuminate\Support\Collection
    {
        $charged = DB::table('venta_detalle_pedido')
            ->whereIn('detalle_pedido_id', DB::table('detalle_pedidos')->where('pedido_id', $order->id)->select('id'))
            ->pluck('detalle_pedido_id')
            ->all();

        return OrderItem::with(['product', 'modifiers'])
            ->where('pedido_id', $order->id)
            ->whereNull('anulado_en')
            ->whereNotIn('id', $charged)
            ->orderBy('id')
            ->get()
            ->keyBy('id');
    }

    /** @param  list<int>|null  $ids  Nulo = toda la cuenta pendiente. */
    private function select(Order $order, \Illuminate\Support\Collection $items, ?array $ids): \Illuminate\Support\Collection
    {
        if ($items->isEmpty()) {
            throw new BusinessException('PEDIDO_NO_COBRABLE', 'Este pedido no tiene platos por cobrar.');
        }
        if ($ids === null) {
            return $items;
        }

        $ids = array_values(array_unique(array_map('intval', $ids)));
        $missing = array_values(array_diff($ids, $items->keys()->all()));

        if ($missing !== []) {
            $already = DB::table('venta_detalle_pedido')->whereIn('detalle_pedido_id', $missing)->exists();
            if ($already) {
                throw new BusinessException('DETALLE_YA_COBRADO', 'Alguno de esos platos ya fue cobrado en otra cuenta.');
            }

            throw ValidationException::withMessages(['detalle_ids' => ['Alguno de esos platos no pertenece a este pedido.']]);
        }

        return $items->only($ids);
    }
}
