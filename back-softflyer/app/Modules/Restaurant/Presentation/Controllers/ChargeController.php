<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Billing\Presentation\ReceiptPresenter;
use App\Core\Cash\Infrastructure\Realtime\CashUpdated;
use App\Core\Sales\Infrastructure\Persistence\Payment;
use App\Modules\Restaurant\Application\ChargeOrder;
use App\Modules\Restaurant\Application\ManageOrders;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Realtime\OrderUpdated;
use App\Modules\Restaurant\Presentation\OrderPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Cobro de pedidos (spec 009, specs/009-caja-cobro/backend.md). */
class ChargeController
{
    public function __construct(
        private readonly ChargeOrder $charge,
        private readonly ManageOrders $orders,
        private readonly OrderPresenter $presenter,
        private readonly ReceiptPresenter $receipts,
    ) {}

    /** Pedidos que pidieron la cuenta, el más antiguo primero. */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['sucursal_id' => ['sometimes', 'integer']]);
        $branches = $request->user()->branches()->modelKeys();

        $orders = Order::whereIn('sucursal_id', isset($data['sucursal_id']) ? array_intersect([(int) $data['sucursal_id']], $branches) : $branches)
            ->where('estado', Order::BILL_REQUESTED)
            // Los "para llevar" de una mesa se cobran junto con ella (spec 038).
            ->whereNull('mesa_referencia_id')
            ->orderBy('abierto_en')
            ->limit(200)
            ->get();

        return response()->json(['data' => $this->presenter->summaries($orders)]);
    }

    public function store(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        if (! $user->worksAt($order->sucursal_id)) {
            throw new AccessDeniedHttpException;
        }

        $data = $request->validate([
            'detalle_ids' => ['sometimes', 'array', 'min:1'],
            'detalle_ids.*' => ['integer', 'distinct'],
            'pedidos_adicionales' => ['sometimes', 'array', 'max:10'],
            'pedidos_adicionales.*' => ['integer', 'distinct'],
            'version' => ['sometimes', 'integer'],
            'cliente' => ['sometimes', 'nullable', 'array'],
            'cliente.tipo_documento' => ['required_with:cliente.numero', 'nullable', 'in:DNI,RUC'],
            'cliente.numero' => ['nullable', 'string', 'max:15'],
            'cliente.nombre' => ['nullable', 'string', 'max:200'],
            'pagos' => ['required', 'array', 'min:1', 'max:10'],
            'pagos.*.metodo_pago_id' => ['required', 'integer'],
            'pagos.*.monto' => ['required', 'numeric', 'gt:0', 'max:9999999.99', 'decimal:0,2'],
            'pagos.*.monto_recibido' => ['sometimes', 'nullable', 'numeric', 'gt:0', 'max:9999999.99', 'decimal:0,2'],
            'pagos.*.referencia' => ['sometimes', 'nullable', 'string', 'max:60'],
        ], ['pagos.required' => 'Indica cómo se paga la cuenta.', 'pagos.min' => 'Indica cómo se paga la cuenta.']);

        $result = $this->charge->handle($user, $order, $data);
        ['sale' => $sale, 'order' => $order] = $result;

        // Después del commit: el salón (mesas libres / pedidos cerrados) y las pantallas de caja.
        foreach ($result['orders'] as $affected) {
            $model = Order::find($affected['id']);
            if ($model !== null) {
                event(new OrderUpdated($order->sucursal_id, $model->id, $this->orders->tableIds($model), $model->estado, $model->version, $user->id));
            }
        }
        event(new CashUpdated($order->sucursal_id, $sale->sesion_caja_id, $user->id));

        return response()->json(['data' => [
            'venta' => ['id' => $sale->id, 'total' => $sale->total, 'igv' => $sale->igv, 'estado' => $sale->estado],
            'pagos' => $sale->payments->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'metodo_pago_id' => (int) $payment->metodo_pago_id,
                'monto' => $payment->monto,
                'monto_recibido' => $payment->monto_recibido,
                'vuelto' => $payment->vuelto,
                'referencia' => $payment->referencia,
            ])->all(),
            'vuelto' => $result['change'],
            'comprobante' => $this->receipts->one($result['receipt']),
            'pedido' => ['id' => $order->id, 'estado' => $order->estado, 'version' => $order->version, 'pendiente' => $result['pending']],
            'pedidos' => $result['orders'],
        ]], 201);
    }
}
