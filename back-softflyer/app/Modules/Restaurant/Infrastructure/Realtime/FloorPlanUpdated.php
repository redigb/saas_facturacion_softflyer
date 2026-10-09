<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/**
 * Alguien guardó el plano de un salón (spec 005). Solo ids y versión: la pantalla
 * vuelve a pedir el plano por la API. ShouldRescue: si Reverb falla, el guardado no.
 */
final class FloorPlanUpdated implements ShouldBroadcastNow, ShouldRescue
{
    public function __construct(
        private readonly int $branchId,
        private readonly int $roomId,
        private readonly int $version,
        private readonly int $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("sucursal.{$this->branchId}.salon");
    }

    public function broadcastAs(): string
    {
        return 'PlanoActualizado';
    }

    public function broadcastWith(): array
    {
        return ['salon_id' => $this->roomId, 'version' => $this->version, 'usuario_id' => $this->userId];
    }
}
