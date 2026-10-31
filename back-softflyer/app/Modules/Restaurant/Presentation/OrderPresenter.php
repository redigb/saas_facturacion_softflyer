<?php

namespace App\Modules\Restaurant\Presentation;

use App\Modules\Restaurant\Infrastructure\Persistence\Modifier;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Shared\Domain\Money;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/** Forma del contrato de specs/006-pedidos-mozo/backend.md. */
final class OrderPresenter
{
    public function full(Order $order): array
    {
        $order->load(['table', 'referenceTable', 'waiter', 'items.product', 'items.ticket', 'items.voidedBy', 'items.modifiers']);
        $active = $order->items->whereNull('anulado_en');
        // Platos ya cobrados en alguna venta (spec 009): la cuenta dividida muestra qué falta.
        $charged = $this->chargedIds($order->items->modelKeys());

        return $this->header($order) + [
            'total' => $this->sum($active),
            'pendiente' => $this->pending($active, $charged),
            'detalles' => $this->details($order, $charged),
            // Spec 038: los "para llevar" de esta mesa se cobran en la misma boleta.
            'acompanantes' => $this->companions($order),
        ];
    }

    /** @param Collection<int, Order> $orders */
    public function summaries(Collection $orders): array
    {
        $orders->load(['table', 'referenceTable', 'waiter', 'items' => fn ($query) => $query->whereNull('anulado_en'), 'items.product', 'items.modifiers']);

        return $orders->map(fn (Order $order) => $this->header($order) + [
            'total' => $this->sum($order->items),
            'platos' => $order->items->count(),
            'pendientes' => $order->items->whereIn('estado_cocina', ['PENDIENTE', 'EN_PREPARACION'])->count(),
            'listos' => $order->items->where('estado_cocina', 'LISTO')->count(),
            'detalles_resumen' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'nombre' => $item->product?->nombre,
                'cantidad' => $item->cantidad,
                'subtotal' => $item->subtotal(),
            ])->all(),
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
            // Spec 038: mesa a la que pertenece un "para llevar" (solo referencia, no la ocupa).
            'mesa_referencia' => $order->referenceTable ? $order->referenceTable->only(['id', 'codigo', 'salon_id']) : null,
            'mozo' => $order->waiter ? $order->waiter->only(['id', 'nombre']) : null,
            'numero_comensales' => $order->numero_comensales,
            'abierto_en' => $order->abierto_en->utc()->toIso8601ZuluString(),
            'cerrado_en' => $order->cerrado_en?->utc()->toIso8601ZuluString(),
        ];
    }

    /** @return list<int> */
    private function chargedIds(array $itemIds): array
    {
        if ($itemIds === []) {
            return [];
        }

        return DB::table('venta_detalle_pedido')->whereIn('detalle_pedido_id', $itemIds)->pluck('detalle_pedido_id')->map(fn ($id) => (int) $id)->all();
    }

    /** @param iterable<OrderItem> $active */
    private function pending(iterable $active, array $charged): string
    {
        $total = 0.0;
        foreach ($active as $item) {
            if (! in_array($item->id, $charged, true)) {
                $total += (float) $item->subtotal();
            }
        }

        return Money::format(Money::cents($total));
    }

    /** @return list<array<string, mixed>> */
    private function details(Order $order, array $charged): array
    {
        return $order->items->map(fn (OrderItem $item) => [
            'id' => $item->id,
            'producto_id' => $item->producto_id,
            'nombre' => $item->product?->nombre,
            'cantidad' => $item->cantidad,
            'precio_unitario' => $item->precio_unitario,
            'descuento' => $item->descuento,
            'promocion' => $item->promocion_nombre,
            'notas' => $item->notas,
            'estado_cocina' => $item->estado_cocina,
            'cobrado' => in_array($item->id, $charged, true),
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
        ])->values()->all();
    }

    /** "Para llevar" activos que pertenecen a la mesa de este pedido (spec 038). */
    private function companions(Order $order): array
    {
        if ($order->tipo !== Order::SALON || $order->mesa_id === null) {
            return [];
        }

        $companions = Order::with(['table', 'referenceTable', 'waiter', 'items.product', 'items.ticket', 'items.voidedBy', 'items.modifiers'])
            ->where('tipo', 'PARA_LLEVAR')
            ->where('mesa_referencia_id', $order->mesa_id)
            ->whereIn('estado', Order::ACTIVE)
            ->orderBy('id')
            ->get();

        if ($companions->isEmpty()) {
            return [];
        }

        $charged = $this->chargedIds($companions->flatMap(fn (Order $companion) => $companion->items->modelKeys())->all());

        return $companions->map(function (Order $companion) use ($charged) {
            $active = $companion->items->whereNull('anulado_en');

            return [
                'id' => $companion->id,
                'numero' => $companion->numero,
                'estado' => $companion->estado,
                'version' => $companion->version,
                'total' => $this->sum($active),
                'pendiente' => $this->pending($active, $charged),
                'detalles' => $this->details($companion, $charged),
            ];
        })->all();
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
