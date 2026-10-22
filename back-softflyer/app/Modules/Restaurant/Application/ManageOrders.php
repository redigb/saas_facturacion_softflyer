<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningTable;
use App\Modules\Restaurant\Infrastructure\Persistence\KitchenTicket;
use App\Modules\Restaurant\Infrastructure\Persistence\MenuAssignments;
use App\Modules\Restaurant\Infrastructure\Persistence\Modifier;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;
use App\Modules\Restaurant\Infrastructure\Persistence\OrderItem;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Pedidos del mozo (spec 006, Doc. 08 §8). Todas las operaciones son transaccionales
 * y bloquean la fila del pedido; los eventos se emiten después, desde el controlador.
 */
final class ManageOrders
{
    /** Fecha de operación del restaurante: el día del turno en Perú. */
    private const TIMEZONE = 'America/Lima';

    public function __construct(
        private readonly TenantContext $context,
        private readonly MenuAssignments $assignments,
    ) {}

    public function open(User $waiter, array $data): Order
    {
        $table = null;
        if ($data['tipo'] === 'SALON') {
            $table = DiningTable::where('es_activa', true)->findOrFail($data['mesa_id']);
            $branchId = (int) DB::table('salones')->where('id', $table->salon_id)->value('sucursal_id');
        } else {
            $branchId = $data['sucursal_id'] ?? $waiter->branches()->first()?->id;
        }

        $this->ensureWorksAt($waiter, $branchId);

        try {
            return DB::transaction(function () use ($waiter, $data, $table, $branchId) {
                if ($table !== null) {
                    $table = DiningTable::whereKey($table->id)->lockForUpdate()->first();
                    if ($table->estado !== DiningTable::FREE) {
                        $this->throwTableTaken($table->id);
                    }
                }

                // Serializa el correlativo diario por sucursal.
                Branch::whereKey($branchId)->lockForUpdate()->first();
                $today = now(self::TIMEZONE)->toDateString();
                $number = (int) Order::where('sucursal_id', $branchId)->whereDate('fecha_operacion', $today)->max('numero') + 1;

                $order = Order::create([
                    'sucursal_id' => $branchId,
                    'numero' => $number,
                    'fecha_operacion' => $today,
                    'tipo' => $data['tipo'],
                    'mesa_id' => $table?->id,
                    'mozo_id' => $waiter->id,
                    'numero_comensales' => $data['numero_comensales'] ?? null,
                    'estado' => Order::OPEN,
                    'abierto_en' => now(),
                ]);

                if ($table !== null) {
                    DB::table('pedido_mesa')->insert([
                        'inquilino_id' => $this->context->id(),
                        'pedido_id' => $order->id,
                        'mesa_id' => $table->id,
                        'unida_en' => now(),
                    ]);
                    $table->update(['estado' => 'OCUPADA']);
                }

                return $order->refresh();
            });
        } catch (QueryException $e) {
            // 23505: el índice único de pedido_mesa ganó la carrera entre dos mozos.
            if ($table !== null && $e->getCode() === '23505') {
                $this->throwTableTaken($table->id);
            }
            throw $e;
        }
    }

    /**
     * Crea los platos de la tanda y una comanda por estación.
     *
     * @param  list<array{producto_id: int, cantidad: numeric, notas?: ?string, modificador_ids?: list<int>}>  $items
     * @return list<KitchenTicket>
     */
    public function send(User $waiter, Order $order, array $items): array
    {
        $this->ensureWorksAt($waiter, $order->sucursal_id);
        $this->ensureCanOperate($waiter, $order);
        $lines = $this->resolveItems($items);

        return DB::transaction(function () use ($waiter, $order, $lines) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->estado !== Order::OPEN) {
                throw new BusinessException('PEDIDO_NO_ABIERTO', 'Este pedido ya no acepta platos. Reábrelo si el cliente pide algo más.');
            }

            // Spec 029: la marca pertenece al envío completo, no al correlativo de
            // una estación. Así una estación nueva también recibe "AGREGÓ".
            $isAddition = KitchenTicket::where('pedido_id', $order->id)->exists();
            $tickets = [];
            foreach (collect($lines)->groupBy(fn (array $line) => $line['estacion_id'] ?? 0) as $stationKey => $group) {
                $stationId = $stationKey === 0 ? null : (int) $stationKey;
                $number = (int) KitchenTicket::where('pedido_id', $order->id)
                    ->where(fn ($query) => $stationId === null ? $query->whereNull('estacion_preparacion_id') : $query->where('estacion_preparacion_id', $stationId))
                    ->max('numero') + 1;

                $ticket = KitchenTicket::create([
                    'pedido_id' => $order->id,
                    'estacion_preparacion_id' => $stationId,
                    'numero' => $number,
                    'es_agregado' => $isAddition,
                    'enviada_por' => $waiter->id,
                    'enviada_en' => now(),
                ]);

                foreach ($group as $line) {
                    $item = OrderItem::create([
                        'pedido_id' => $order->id,
                        'comanda_id' => $ticket->id,
                        'producto_id' => $line['producto']->id,
                        'cantidad' => $line['cantidad'],
                        'precio_unitario' => $line['producto']->precio_venta,
                        'notas' => $line['notas'],
                    ]);

                    foreach ($line['modificadores'] as $modifier) {
                        DB::table('detalle_pedido_modificador')->insert([
                            'inquilino_id' => $this->context->id(),
                            'detalle_pedido_id' => $item->id,
                            'modificador_id' => $modifier->id,
                            'precio_adicional' => $modifier->precio_adicional,
                        ]);
                    }
                }

                $tickets[] = $ticket;
            }

            $order->increment('version');

            return $tickets;
        });
    }

    public function voidItem(User $user, Order $order, OrderItem $item, string $reason): OrderItem
    {
        $this->ensureWorksAt($user, $order->sucursal_id);

        return DB::transaction(function () use ($user, $order, $item, $reason) {
            Order::whereKey($order->id)->lockForUpdate()->first();
            $item = OrderItem::whereKey($item->id)->lockForUpdate()->firstOrFail();

            if ($item->anulado_en !== null) {
                throw new BusinessException('DETALLE_YA_ANULADO', 'Este plato ya estaba anulado.');
            }

            $item->update(['anulado_en' => now(), 'anulado_por' => $user->id, 'motivo_anulacion' => $reason]);
            Order::whereKey($order->id)->increment('version');

            return $item;
        });
    }

    public function requestBill(User $user, Order $order): Order
    {
        return $this->transition($user, $order, Order::OPEN, Order::BILL_REQUESTED, 'POR_COBRAR');
    }

    public function reopen(User $user, Order $order): Order
    {
        return $this->transition($user, $order, Order::BILL_REQUESTED, Order::OPEN, 'OCUPADA');
    }

    public function cancel(User $user, Order $order): Order
    {
        $this->ensureWorksAt($user, $order->sucursal_id);
        $this->ensureCanOperate($user, $order);

        return DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($order->estado, Order::ACTIVE, true)) {
                throw new BusinessException('PEDIDO_NO_ABIERTO', 'Este pedido ya está cerrado o anulado.');
            }
            if ($order->items()->whereNull('anulado_en')->exists()) {
                throw new BusinessException('PEDIDO_CON_ENVIOS', 'El pedido tiene platos enviados a cocina. Anúlalos primero o cobra el pedido.');
            }

            $order->update(['estado' => Order::CANCELLED, 'cerrado_en' => now(), 'version' => $order->version + 1]);
            $this->releaseTables($order);

            return $order;
        });
    }

    /**
     * Cierra un pedido cobrado por completo y libera sus mesas. Va dentro de la
     * transacción del cobro y con la fila del pedido bloqueada (spec 009).
     */
    public function close(Order $order): Order
    {
        $order->update(['estado' => Order::CLOSED, 'cerrado_en' => now(), 'version' => $order->version + 1]);
        $this->releaseTables($order);

        return $order;
    }

    /** @return list<int> */
    public function tableIds(Order $order): array
    {
        return DB::table('pedido_mesa')->where('pedido_id', $order->id)->pluck('mesa_id')->map(fn ($id) => (int) $id)->all();
    }

    private function transition(User $user, Order $order, string $from, string $to, string $tableStatus): Order
    {
        $this->ensureWorksAt($user, $order->sucursal_id);
        $this->ensureCanOperate($user, $order);

        return DB::transaction(function () use ($order, $from, $to, $tableStatus) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->estado !== $from) {
                throw new BusinessException('PEDIDO_NO_ABIERTO', $from === Order::OPEN
                    ? 'Este pedido no está abierto.'
                    : 'Este pedido no está esperando cobro.');
            }

            $order->update(['estado' => $to, 'version' => $order->version + 1]);
            DiningTable::whereIn('id', $this->activeTableIds($order))->update(['estado' => $tableStatus]);

            return $order;
        });
    }

    private function releaseTables(Order $order): void
    {
        DiningTable::whereIn('id', $this->activeTableIds($order))->update(['estado' => DiningTable::FREE]);
        DB::table('pedido_mesa')->where('pedido_id', $order->id)->whereNull('liberada_en')->update(['liberada_en' => now()]);
    }

    /** @return list<int> */
    private function activeTableIds(Order $order): array
    {
        return DB::table('pedido_mesa')->where('pedido_id', $order->id)->whereNull('liberada_en')->pluck('mesa_id')->all();
    }

    /**
     * Valida productos y modificadores contra la carta vigente y resuelve la estación.
     *
     * @return list<array{producto: Product, cantidad: string, notas: ?string, modificadores: list<Modifier>, estacion_id: ?int}>
     */
    private function resolveItems(array $items): array
    {
        $products = Product::whereIn('id', array_column($items, 'producto_id'))->get()->keyBy('id');
        $productStations = $this->assignments->productStations($products->modelKeys());
        $categoryStations = $this->assignments->categoryStations($products->pluck('categoria_id')->filter()->unique()->values()->all());
        $productGroups = $this->assignments->productGroups($products->modelKeys());
        $groups = ModifierGroup::with('modifiers')->whereIn('id', collect($productGroups)->flatten()->unique()->all())->get()->keyBy('id');

        $errors = [];
        $lines = [];

        foreach (array_values($items) as $index => $item) {
            $product = $products->get($item['producto_id']);

            if ($product === null || ! $product->es_activo || ! $product->es_vendible) {
                $errors["items.{$index}.producto_id"] = [($product?->nombre ?? 'Este plato').' ya no está disponible en la carta.'];

                continue;
            }

            $chosen = array_values(array_unique($item['modificador_ids'] ?? []));
            $allowed = $productGroups[$product->id] ?? [];
            $modifiers = [];

            foreach ($allowed as $groupId) {
                $group = $groups->get($groupId);
                $picked = $group->modifiers->filter(fn (Modifier $modifier) => $modifier->es_activo && in_array($modifier->id, $chosen, true));
                $modifiers = [...$modifiers, ...$picked->all()];

                if ($picked->count() < $group->seleccion_minima || $picked->count() > $group->seleccion_maxima) {
                    $errors["items.{$index}.modificador_ids"] = [$group->seleccion_minima === $group->seleccion_maxima
                        ? "{$product->nombre}: elige {$group->seleccion_minima} en “{$group->nombre}”."
                        : "{$product->nombre}: elige entre {$group->seleccion_minima} y {$group->seleccion_maxima} en “{$group->nombre}”."];
                }
            }

            if (count($modifiers) !== count($chosen)) {
                $errors["items.{$index}.modificador_ids"] ??= ["{$product->nombre}: hay opciones que no corresponden a este plato o ya no están disponibles."];
            }

            $lines[] = [
                'producto' => $product,
                'cantidad' => (string) $item['cantidad'],
                'notas' => isset($item['notas']) && trim((string) $item['notas']) !== '' ? trim((string) $item['notas']) : null,
                'modificadores' => $modifiers,
                'estacion_id' => $productStations[$product->id] ?? $categoryStations[$product->categoria_id] ?? null,
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $lines;
    }

    /** Doc. 06 §6: el rol vale en las sucursales de su asignación. */
    private function ensureWorksAt(User $user, ?int $branchId): void
    {
        if ($branchId === null || ! $user->worksAt($branchId)) {
            throw new AccessDeniedHttpException;
        }
    }

    /** Spec 025: un pedido lo opera su mozo dueño o la jefatura (encargado/admin). */
    private function ensureCanOperate(User $user, Order $order): void
    {
        if ((int) $order->mozo_id === (int) $user->id) {
            return;
        }

        if ($user->hasPermission('restaurante.mesas.gestionar') || $user->hasPermission('panel.ver')) {
            return;
        }

        throw new BusinessException('PEDIDO_AJENO', 'Este pedido lo abrió otra persona. Solo ella, el encargado o el admin pueden atenderlo.', 403, [
            'mozo' => $order->waiter?->nombre,
        ]);
    }

    private function throwTableTaken(int $tableId): never
    {
        $orderId = DB::table('pedido_mesa')->where('mesa_id', $tableId)->whereNull('liberada_en')->value('pedido_id');

        throw new BusinessException('MESA_OCUPADA', 'Otra persona ya abrió un pedido en esta mesa.', 409, ['pedido_id' => $orderId]);
    }
}
