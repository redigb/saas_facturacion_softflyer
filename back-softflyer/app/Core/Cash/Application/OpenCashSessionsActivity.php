<?php

namespace App\Core\Cash\Application;

use App\Core\Cash\Infrastructure\Persistence\CashSession;
use App\Core\Tenancy\Application\BranchActivity;
use Illuminate\Support\Facades\DB;

/** Una sucursal con un turno de caja abierto no se desactiva (spec 011). */
final class OpenCashSessionsActivity implements BranchActivity
{
    public function blockingReason(int $branchId): ?string
    {
        $open = CashSession::where('estado', CashSession::OPEN)
            ->whereIn('caja_id', DB::table('cajas')->where('sucursal_id', $branchId)->select('id'))
            ->exists();

        return $open ? 'Hay un turno de caja abierto en esta sucursal. Ciérralo primero.' : null;
    }
}
