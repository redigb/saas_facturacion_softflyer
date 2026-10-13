<?php

namespace App\Core\Cash\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/**
 * Cambió algo de un turno de caja: apertura, cobro, movimiento o cierre (spec 009).
 * Solo ids; la pantalla vuelve a pedir el resumen. Si Reverb falla, la operación no.
 */
final class CashUpdated implements ShouldBroadcastNow, ShouldRescue
{
    public function __construct(
        private readonly int $branchId,
        private readonly int $sessionId,
        private readonly int $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("sucursal.{$this->branchId}.caja");
    }

    public function broadcastAs(): string
    {
        return 'CajaActualizada';
    }

    public function broadcastWith(): array
    {
        return ['sesion_id' => $this->sessionId, 'usuario_id' => $this->userId];
    }
}
