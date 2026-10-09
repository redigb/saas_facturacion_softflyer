<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Application\ManageOrders;
use App\Modules\Restaurant\Infrastructure\Persistence\KitchenTicket;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Modules\Restaurant\Infrastructure\Realtime\ItemVoided;
use App\Modules\Restaurant\Infrastructure\Realtime\OrderUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\TicketSent;
use App\Modules\Restaurant\Presentation\OrderPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Pedidos del mozo (spec 006, specs/006-pedidos-mozo/backend.md). */
class OrderController
{
    public function __construct(
        private readonly ManageOrders $orders,
        private readonly OrderPresenter $presenter,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['sometimes', 'integer'],
            'estado' => ['sometimes', 'string'],
        ]);
        $user = $request->user();
        $branches = $user->branches()->modelKeys();
        $statuses = array_intersect(explode(',', $data['estado'] ?? implode(',', Order::ACTIVE)), [Order::OPEN, Order::BILL_REQUESTED, Order::CLOSED, Order::CANCELLED]);

        $orders = Order::whereIn('sucursal_id', isset($data['sucursal_id']) ? array_intersect([(int) $data['sucursal_id']], $branches) : $branches)
            ->whereIn('estado', $statuses)
            ->orderBy('abierto_en')
            ->limit(500)
            ->get();

        return response()->json(['data' => $this->presenter->summaries($orders)]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->ensureVisible($request->user(), $order);

        return response()->json(['data' => $this->presenter->full($order)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo' => ['required', Rule::in(['SALON', 'PARA_LLEVAR'])],
            'mesa_id' => ['required_if:tipo,SALON', 'prohibited_if:tipo,PARA_LLEVAR', 'integer', Rule::exists('mesas', 'id')->where('es_activa', true)],
            'sucursal_id' => ['sometimes', 'integer'],
            'numero_comensales' => ['sometimes', 'nullable', 'integer', 'between:1,99'],
        ], [
            'mesa_id.required_if' => 'Elige la mesa.',
            'mesa_id.exists' => 'Esa mesa no existe o fue retirada del plano.',
            'numero_comensales.between' => 'Entre 1 y 99 personas.',
        ]);

        $order = $this->orders->open($request->user(), $data);
        $this->notify($order, $request->user());

        return response()->json(['data' => $this->presenter->full($order)], 201);
    }

    public function send(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.producto_id' => ['required', 'integer'],
            'items.*.cantidad' => ['required', 'numeric', 'min:0.001', 'max:999', 'decimal:0,3'],
            'items.*.notas' => ['nullable', 'string', 'max:200'],
            'items.*.modificador_ids' => ['sometimes', 'array', 'max:20'],
            'items.*.modificador_ids.*' => ['integer'],
        ], [
            'items.required' => 'Agrega al menos un plato.',
            'items.*.cantidad.min' => 'La cantidad debe ser mayor que cero.',
        ]);

        $user = $request->user();
        $tickets = $this->orders->send($user, $order, $data['items']);
        $order->refresh();

        // Después del commit: cada estación recibe su comanda al instante.
        foreach ($tickets as $ticket) {
            event(new TicketSent($order->sucursal_id, $ticket->estacion_preparacion_id, $ticket->id, $order->id, $user->id));
        }
        $this->notify($order, $user);

        return response()->json(['data' => $this->presenter->full($order)], 201);
    }

    public function voidItem(Request $request, Order $order, OrderItem $item): JsonResponse
    {
        if ($item->pedido_id !== $order->id) {
            throw new NotFoundHttpException;
        }
        $data = $request->validate(['motivo' => ['required', 'string', 'max:200']], ['motivo.required' => 'Indica por qué se anula el plato.']);

        $user = $request->user();
        $item = $this->orders->voidItem($user, $order, $item, trim($data['motivo']));
        $order->refresh();

        $ticket = KitchenTicket::find($item->comanda_id);
        if ($ticket) {
            event(new ItemVoided($order->sucursal_id, $ticket->estacion_preparacion_id, $item->id, $ticket->id, $order->id, $user->id));
        }
        $this->notify($order, $user);

        return response()->json(['data' => $this->presenter->full($order)]);
    }

    public function requestBill(Request $request, Order $order): JsonResponse
    {
        return $this->respond($request, $this->orders->requestBill($request->user(), $order));
    }

    public function reopen(Request $request, Order $order): JsonResponse
    {
        return $this->respond($request, $this->orders->reopen($request->user(), $order));
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        return $this->respond($request, $this->orders->cancel($request->user(), $order));
    }

    private function respond(Request $request, Order $order): JsonResponse
    {
        $this->notify($order, $request->user());

        return response()->json(['data' => $this->presenter->full($order)]);
    }

    private function notify(Order $order, User $user): void
    {
        event(new OrderUpdated($order->sucursal_id, $order->id, $this->orders->tableIds($order), $order->estado, $order->version, $user->id));
    }

    private function ensureVisible(User $user, Order $order): void
    {
        if (! $user->worksAt($order->sucursal_id)) {
            throw new AccessDeniedHttpException;
        }
    }
}
