<?php

namespace App\Core\Tenancy\Infrastructure;

use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Inquilino del request actual. Fijarlo aqui tambien lo fija en la sesion de
 * PostgreSQL, que es lo que hace cumplir RLS.
 */
final class TenantContext
{
    private ?Tenant $tenant = null;

    public function set(Tenant $tenant): void
    {
        DB::select("SELECT set_config('app.inquilino_actual', ?, false)", [(string) $tenant->getKey()]);

        $this->tenant = $tenant;
    }

    public function clear(): void
    {
        DB::select("SELECT set_config('app.inquilino_actual', '', false)");

        $this->tenant = null;
    }

    public function id(): ?int
    {
        return $this->tenant?->getKey();
    }

    public function tenant(): Tenant
    {
        return $this->tenant ?? throw new LogicException('No hay un inquilino resuelto para este request.');
    }
}
