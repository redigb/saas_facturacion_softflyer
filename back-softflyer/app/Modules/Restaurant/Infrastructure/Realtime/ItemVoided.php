<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/** Se anuló un plato ya enviado: la estación debe dejar de prepararlo (spec 006). */
final class ItemVoided implements ShouldBroadcastNow, ShouldRescue
{
    public function __construct(
        private readonly int $branchId,
        private readonly ?int $stationId,
        private readonly int $itemId,
        private readonly int $ticketId,
        private readonly int $orderId,
        private readonly int $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(StationChannel::name($this->branchId, $this->stationId));
    }

    public function broadcastAs(): string
    {
        return 'PlatoAnulado';
    }

    public function broadcastWith(): array
    {
        return ['detalle_id' => $this->itemId, 'comanda_id' => $this->ticketId, 'pedido_id' => $this->orderId, 'usuario_id' => $this->userId];
    }
}
