<?php

namespace App\Modules\Restaurant\Presentation;

use App\Modules\Restaurant\Infrastructure\Persistence\Modifier;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use Illuminate\Database\Eloquent\Collection;

/** Forma del contrato de specs/006-pedidos-mozo/backend.md. */
final class OrderPresenter
{
    public function full(Order $order): array
    {
        $order->load(['table', 'waiter', 'items.product', 'items.ticket', 'items.voidedBy', 'items.modifiers']);
        $active = $order->items->whereNull('anulado_en');

        return $this->header($order) + [
            'total' => $this->sum($active),
            'detalles' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'producto_id' => $item->producto_id,
                'nombre' => $item->product?->nombre,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precio_unitario,
                'notas' => $item->notas,
                'estado_cocina' => $item->estado_cocina,
                'comanda' => $item->ticket ? [
                    'id' => $item->ticket->id,
                    'numero' => $item->ticket->numero,
                    'estacion_preparacion_id' => $item->ticket->estacion_preparacion_id,
                    'enviada_en' => $item->ticket->enviada_en?->utc()->toIso8601ZuluString(),
                ] : null,
                'modificadores' => $item->modifiers->map(fn (Modifier $modifier) => [
                    'id' => $modifier->id,
                    'nombre' => $modifier->nombre,
                    'precio_adicional' => number_format((float) $modifier->pivot->precio_adicional, 2, '.', ''),
                ])->all(),
                'subtotal' => $item->subtotal(),
                'anulado' => $item->anulado_en ? [
                    'en' => $item->anulado_en->utc()->toIso8601ZuluString(),
                    'por' => $item->voidedBy?->nombre,
                    'motivo' => $item->motivo_anulacion,
                ] : null,
            ])->all(),
        ];
    }

    /** @param Collection<int, Order> $orders */
    public function summaries(Collection $orders): array
    {
        $orders->load(['table', 'waiter', 'items' => fn ($query) => $query->whereNull('anulado_en'), 'items.modifiers']);

        return $orders->map(fn (Order $order) => $this->header($order) + [
            'total' => $this->sum($order->items),
            'platos' => $order->items->count(),
            'pendientes' => $order->items->whereIn('estado_cocina', ['PENDIENTE', 'EN_PREPARACION'])->count(),
            'listos' => $order->items->where('estado_cocina', 'LISTO')->count(),
        ])->all();
    }

    private function header(Order $order): array
    {
        return [
            'id' => $order->id,
            'numero' => $order->numero,
            'tipo' => $order->tipo,
            'estado' => $order->estado,
            'version' => $order->version,
            'sucursal_id' => $order->sucursal_id,
            'mesa' => $order->table ? $order->table->only(['id', 'codigo', 'salon_id']) : null,
            'mozo' => $order->waiter ? $order->waiter->only(['id', 'nombre']) : null,
            'numero_comensales' => $order->numero_comensales,
            'abierto_en' => $order->abierto_en->utc()->toIso8601ZuluString(),
        ];
    }

    /** @param iterable<OrderItem> $items */
    private function sum(iterable $items): string
    {
        $total = 0.0;
        foreach ($items as $item) {
            $total += (float) $item->subtotal();
        }

        return number_format($total, 2, '.', '');
    }
}
