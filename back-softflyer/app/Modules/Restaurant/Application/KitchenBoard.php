<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Infrastructure\Persistence\KitchenTicket;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Pantalla de cocina (spec 007, Doc. 05 §4.3): comandas por estación y estado de cada plato.
 */
final class KitchenBoard
{
    public const STATES = ['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'];

    /** Las comandas completas siguen visibles este tiempo, para poder deshacer. */
    private const RECENT_MINUTES = 10;

    private const COOK = 'restaurante.cocina.actualizar_estado';

    private const WAITER = 'restaurante.pedidos.crear';

    /**
     * @param  int|'general'  $station
     * @return Collection<int, KitchenTicket>
     */
    public function tickets(User $user, int $branchId, int|string $station): Collection
    {
        if (! $user->worksAt($branchId)) {
            throw new AccessDeniedHttpException;
        }

        $tickets = KitchenTicket::query()
            ->whereHas('order', fn ($query) => $query->where('sucursal_id', $branchId)->whereIn('estado', Order::ACTIVE))
            ->when($station === 'general', fn ($query) => $query->whereNull('estacion_preparacion_id'), fn ($query) => $query->where('estacion_preparacion_id', $station))
            ->with(['order.table', 'items.product', 'items.modifiers', 'sender'])
            ->orderBy('enviada_en')
            ->orderBy('id')
            ->get();

        $recent = now()->subMinutes(self::RECENT_MINUTES);

        return $tickets->filter(function (KitchenTicket $ticket) use ($recent) {
            $live = $ticket->items->whereNull('anulado_en');

            return $live->contains(fn (OrderItem $item) => in_array($item->estado_cocina, ['PENDIENTE', 'EN_PREPARACION'], true))
                || ($live->isNotEmpty() && $live->contains('estado_cocina', 'LISTO') && $live->max('actualizado_en') >= $recent);
        })->values();
    }

    /**
     * @return array{ticket: KitchenTicket, order: Order, ready: list<OrderItem>}
     */
    public function setItemState(User $user, OrderItem $item, string $state): array
    {
        return $this->change($user, $item->comanda_id, fn (KitchenTicket $ticket) => $ticket->items->where('id', $item->id), $state);
    }

    /**
     * "Todo listo": todos los platos vigentes de la comanda pasan a LISTO.
     *
     * @return array{ticket: KitchenTicket, order: Order, ready: list<OrderItem>}
     */
    public function ticketReady(User $user, KitchenTicket $ticket): array
    {
        return $this->change($user, $ticket->id, fn (KitchenTicket $locked) => $locked->items->whereNull('anulado_en')->whereIn('estado_cocina', ['PENDIENTE', 'EN_PREPARACION']), 'LISTO');
    }

    /**
     * Marca la comanda como impresa (spec 027). La primera marca gana: reimprimir no la mueve.
     */
    public function markPrinted(User $user, KitchenTicket $ticket): KitchenTicket
    {
        $order = Order::whereKey($ticket->pedido_id)->firstOrFail();

        if (! $user->worksAt($order->sucursal_id)) {
            throw new AccessDeniedHttpException;
        }

        if ($ticket->impresa_en === null) {
            $ticket->update(['impresa_en' => now()]);
        }

        return $ticket->fresh(['order.table', 'items.product', 'items.modifiers', 'sender']);
    }

    /**
     * @param  callable(KitchenTicket): \Illuminate\Support\Collection<int, OrderItem>  $select
     * @return array{ticket: KitchenTicket, order: Order, ready: list<OrderItem>}
     */
    private function change(User $user, int $ticketId, callable $select, string $state): array
    {
        return DB::transaction(function () use ($user, $ticketId, $select, $state) {
            $ticket = KitchenTicket::findOrFail($ticketId);
            $order = Order::whereKey($ticket->pedido_id)->lockForUpdate()->firstOrFail();

            if (! $user->worksAt($order->sucursal_id)) {
                throw new AccessDeniedHttpException;
            }
            if (! in_array($order->estado, Order::ACTIVE, true)) {
                throw new BusinessException('PEDIDO_NO_ACTIVO', 'El pedido ya está cerrado o anulado.');
            }

            $ticket->load('items.product');
            $ready = [];
            $changed = false;

            foreach ($select($ticket) as $item) {
                if ($item->anulado_en !== null) {
                    throw new BusinessException('DETALLE_ANULADO', 'Este plato fue anulado: no se prepara.');
                }
                if ($item->estado_cocina === $state) {
                    continue;
                }

                $this->authorize($user, $item->estado_cocina, $state);
                $item->update(['estado_cocina' => $state]);
                $changed = true;

                if ($state === 'LISTO') {
                    $ready[] = $item;
                }
            }

            if ($changed) {
                $order->increment('version');
            }

            return ['ticket' => $ticket->fresh(['items.product', 'items.modifiers', 'order.table', 'sender']), 'order' => $order->fresh('table'), 'ready' => $ready];
        });
    }

    /** Doc. 05 §4.3: la cocina avanza y deshace un paso; el mozo entrega lo que está listo. */
    private function authorize(User $user, string $from, string $to): void
    {
        $fromIndex = array_search($from, self::STATES, true);
        $toIndex = array_search($to, self::STATES, true);

        $kitchenForward = $to !== 'ENTREGADO' && $toIndex > $fromIndex && $from !== 'ENTREGADO';
        $kitchenUndo = $from !== 'ENTREGADO' && $toIndex === $fromIndex - 1;
        $delivery = $from === 'LISTO' && $to === 'ENTREGADO';

        if (! $kitchenForward && ! $kitchenUndo && ! $delivery) {
            throw new BusinessException('TRANSICION_INVALIDA', 'Ese cambio de estado no está permitido.');
        }

        $allowed = $delivery
            ? $user->hasPermission(self::WAITER) || $user->hasPermission(self::COOK)
            : $user->hasPermission(self::COOK);

        if (! $allowed) {
            throw new AccessDeniedHttpException;
        }
    }
}
