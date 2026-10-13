<?php

namespace App\Modules\Restaurant\Application;

use App\Core\Tenancy\Application\BranchActivity;
use App\Modules\Restaurant\Infrastructure\Persistence\Order;

/** Una sucursal con pedidos abiertos o por cobrar no se desactiva (spec 011). */
final class OpenOrdersActivity implements BranchActivity
{
    public function blockingReason(int $branchId): ?string
    {
        $count = Order::where('sucursal_id', $branchId)->whereIn('estado', Order::ACTIVE)->count();

        return $count > 0
            ? "Hay {$count} ".($count === 1 ? 'pedido abierto' : 'pedidos abiertos').' en esta sucursal. Cóbralos o anúlalos primero.'
            : null;
    }
}
