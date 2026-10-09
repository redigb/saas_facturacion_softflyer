<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/**
 * La carta cambió (spec 005). La carta es del restaurante, no de una sucursal: se avisa
 * en el canal de salón de cada sucursal, que es donde escuchan los mozos.
 */
final class MenuUpdated implements ShouldBroadcastNow, ShouldRescue
{
    /** @param list<int> $branchIds */
    public function __construct(
        private readonly array $branchIds,
        private readonly int $userId,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return array_map(fn (int $id) => new PrivateChannel("sucursal.{$id}.salon"), $this->branchIds);
    }

    public function broadcastAs(): string
    {
        return 'CartaActualizada';
    }

    public function broadcastWith(): array
    {
        return ['usuario_id' => $this->userId];
    }
}
