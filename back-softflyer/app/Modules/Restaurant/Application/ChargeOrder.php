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
     * @param  array{detalle_ids?: list<int>, pedidos_adicionales?: list<int>, version?: int, cliente?: ?array<string, mixed>, pagos: list<array<string, mixed>>}  $data
     * @return array{sale: \App\Core\Sales\Infrastructure\Persistence\Sale, receipt: Receipt, order: Order, orders: list<array<string, mixed>>, change: string, pending: string}
     */
    public function handle(User $cashier, Order $order, array $data): array
    {
        $session = $this->cash->requireOpen($cashier);

        if ($order->sucursal_id !== $session->register->sucursal_id) {
            throw new AccessDeniedHttpException;
        }

        return DB::transaction(function () use ($cashier, $order, $data, $session) {
            // Bloquea el turno (que no se cierre a medio cobro) y los pedidos (que no se cobren dos veces).
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

            // Spec 038: la mesa puede arrastrar sus "para llevar" a la misma boleta.
            $orders = [$order, ...$this->companions($order, $data['pedidos_adicionales'] ?? [])];
            $items = collect($orders)->flatMap(fn (Order $affected) => $this->unchargedItems($affected)->all())->keyBy('id');
            $selected = $this->select($items, $data['detalle_ids'] ?? null);

            $sale = $this->sales->handle($cashier, $session, $order->sucursal_id, $selected->map(fn (OrderItem $item) => [
                'producto_id' => $item->producto_id,
                'descripcion' => $item->product?->nombre ?? 'Plato',
                'cantidad' => (string) $item->cantidad,
                'descuento' => (string) $item->descuento,
                'total' => $item->subtotal(),
            ])->all(), $data['pagos']);

            // Spec 010: el comprobante nace con la venta, en la misma transacción.
            $receipt = $this->receipts->handle($sale, $data['cliente'] ?? null);

            DB::table('venta_detalle_pedido')->insert($selected->map(fn (OrderItem $item) => [
                'inquilino_id' => $this->context->id(),
                'venta_id' => $sale->id,
                'detalle_pedido_id' => $item->id,
            ])->all());

            $results = [];
            $pending = 0;
            foreach ($orders as $affected) {
                $remaining = $items->filter(fn (OrderItem $item) => (int) $item->pedido_id === (int) $affected->id && ! $selected->has($item->id));
                $amount = (int) $remaining->sum(fn (OrderItem $item) => Money::cents($item->subtotal()));
                $pending += $amount;

                if ($remaining->isEmpty()) {
                    $affected = $this->orders->close($affected);
                } else {
                    $affected->update(['version' => $affected->version + 1]);
                }

                $results[] = [
                    'id' => $affected->id,
                    'estado' => $affected->estado,
                    'version' => $affected->version,
                    'pendiente' => Money::format($amount),
                ];
            }

            return [
                'sale' => $sale,
                'receipt' => $receipt,
                'order' => Order::whereKey($order->id)->firstOrFail(),
                'orders' => $results,
                'change' => Money::format((int) $sale->payments->sum(fn ($payment) => Money::cents($payment->vuelto))),
                'pending' => Money::format($pending),
            ];
        });
    }

    /**
     * Pedidos "para llevar" que pertenecen a la misma mesa del principal (spec 038).
     *
     * @param  list<int>  $ids
     * @return list<Order>
     */
    private function companions(Order $primary, array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        $ids = array_values(array_diff($ids, [$primary->id]));

        if ($ids === []) {
            return [];
        }
        if ($primary->tipo !== Order::SALON || $primary->mesa_id === null) {
            throw new BusinessException('COBRO_GRUPO_INVALIDO', 'Solo la cuenta de una mesa puede incluir pedidos para llevar.', 422);
        }

        $orders = Order::whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');

        if ($orders->count() !== count($ids)) {
            throw ValidationException::withMessages(['pedidos_adicionales' => ['Alguno de esos pedidos ya no existe.']]);
        }

        foreach ($orders as $companion) {
            if ((int) $companion->sucursal_id !== (int) $primary->sucursal_id
                || $companion->tipo !== Order::TAKEAWAY
                || (int) $companion->mesa_referencia_id !== (int) $primary->mesa_id) {
                throw new BusinessException('COBRO_GRUPO_INVALIDO', 'Ese pedido para llevar no pertenece a la mesa que estás cobrando.', 422);
            }
            if (! in_array($companion->estado, Order::ACTIVE, true)) {
                throw new BusinessException('PEDIDO_NO_COBRABLE', 'Uno de los pedidos para llevar ya está cerrado o anulado.', 422);
            }
        }

        return $orders->values()->all();
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
    private function select(\Illuminate\Support\Collection $items, ?array $ids): \Illuminate\Support\Collection
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
