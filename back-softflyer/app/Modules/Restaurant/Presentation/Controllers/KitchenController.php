<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Application\KitchenBoard;
use App\Modules\Restaurant\Application\ManageOrders;
use App\Modules\Restaurant\Infrastructure\Persistence\KitchenTicket;
use App\Modules\Restaurant\Infrastructure\Persistence\Modifier;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Modules\Restaurant\Infrastructure\Realtime\DishReady;
use App\Modules\Restaurant\Infrastructure\Realtime\KitchenStatusUpdated;
use App\Modules\Restaurant\Infrastructure\Realtime\OrderUpdated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Pantalla de cocina (spec 007, specs/007-cocina-kds/backend.md). */
class KitchenController
{
    public function __construct(
        private readonly KitchenBoard $board,
        private readonly ManageOrders $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sucursal_id' => ['sometimes', 'integer'],
            'estacion_id' => ['required', 'regex:/^(general|\d+)$/'],
        ], ['estacion_id.required' => 'Elige la estación.']);

        $branch = $data['sucursal_id'] ?? $request->user()->branches()->first()?->id ?? throw new AccessDeniedHttpException;
        $station = $data['estacion_id'] === 'general' ? 'general' : (int) $data['estacion_id'];

        return response()->json(['data' => $this->board->tickets($request->user(), (int) $branch, $station)
            ->map(fn (KitchenTicket $ticket) => $this->ticket($ticket))]);
    }

    public function updateItem(Request $request, OrderItem $item): JsonResponse
    {
        $data = $request->validate(['estado_cocina' => ['required', Rule::in(KitchenBoard::STATES)]]);

        return $this->respond($request->user(), $this->board->setItemState($request->user(), $item, $data['estado_cocina']));
    }

    public function ticketReady(Request $request, KitchenTicket $ticket): JsonResponse
    {
        return $this->respond($request->user(), $this->board->ticketReady($request->user(), $ticket));
    }

    /** La comanda salió del diálogo de impresión del navegador (spec 027). */
    public function printed(Request $request, KitchenTicket $ticket): JsonResponse
    {
        return response()->json(['data' => $this->ticket($this->board->markPrinted($request->user(), $ticket))]);
    }

    /** @param array{ticket: KitchenTicket, order: Order, ready: list<OrderItem>} $result */
    private function respond(User $user, array $result): JsonResponse
    {
        ['ticket' => $ticket, 'order' => $order, 'ready' => $ready] = $result;

        // Después del commit: otras pantallas de la estación, el salón y el mozo del pedido.
        event(new KitchenStatusUpdated($order->sucursal_id, $ticket->estacion_preparacion_id, $ticket->id, $order->id, $user->id));
        event(new OrderUpdated($order->sucursal_id, $order->id, $this->orders->tableIds($order), $order->estado, $order->version, $user->id));

        if ($ready !== []) {
            event(new DishReady(
                $order->sucursal_id,
                $order->mozo_id,
                $order->id,
                array_map(fn (OrderItem $item) => $item->id, $ready),
                $order->table?->codigo,
                array_map(fn (OrderItem $item) => ((float) $item->cantidad == (int) $item->cantidad ? (int) $item->cantidad : (float) $item->cantidad).'× '.$item->product?->nombre, $ready),
                $user->id,
            ));
        }

        return response()->json(['data' => $this->ticket($ticket)]);
    }

    private function ticket(KitchenTicket $ticket): array
    {
        $live = $ticket->items->whereNull('anulado_en');

        return [
            'id' => $ticket->id,
            'numero' => $ticket->numero,
            'estacion_preparacion_id' => $ticket->estacion_preparacion_id,
            'enviada_en' => $ticket->enviada_en->utc()->toIso8601ZuluString(),
            'enviada_por' => $ticket->sender?->nombre,
            'impresa_en' => $ticket->impresa_en?->utc()->toIso8601ZuluString(),
            'completa' => ! $live->contains(fn (OrderItem $item) => in_array($item->estado_cocina, ['PENDIENTE', 'EN_PREPARACION'], true)),
            'pedido' => [
                'id' => $ticket->order->id,
                'numero' => $ticket->order->numero,
                'tipo' => $ticket->order->tipo,
                'mesa' => $ticket->order->table?->codigo,
                'estado' => $ticket->order->estado,
            ],
            // Sin precios: la cocina no los necesita (Doc. 08 §4).
            'detalles' => $ticket->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'nombre' => $item->product?->nombre,
                'cantidad' => $item->cantidad,
                'notas' => $item->notas,
                'modificadores' => $item->modifiers->map(fn (Modifier $modifier) => $modifier->nombre)->all(),
                'estado_cocina' => $item->estado_cocina,
                'anulado' => $item->anulado_en !== null,
            ])->values()->all(),
        ];
    }
}
