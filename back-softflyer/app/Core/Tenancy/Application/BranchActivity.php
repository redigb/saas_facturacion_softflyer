<?php

namespace App\Core\Tenancy\Application;

/**
 * Punto de extensión: quien tenga trabajo en curso en una sucursal (pedidos abiertos,
 * un turno de caja…) lo declara aquí y la sucursal no se desactiva mientras tanto.
 * Así el Core no conoce a los módulos (Doc. 01 §3).
 *
 * Se registra con la etiqueta `branch.activity`.
 */
interface BranchActivity
{
    /** Motivo legible si la sucursal tiene actividad que impide desactivarla; nulo si está libre. */
    public function blockingReason(int $branchId): ?string;
}
