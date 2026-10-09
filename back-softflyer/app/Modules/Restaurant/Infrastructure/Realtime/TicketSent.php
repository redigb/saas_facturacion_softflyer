<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/** Llegó una comanda a una estación (spec 006); el KDS la pide por la API (spec 007). */
final class TicketSent implements ShouldBroadcastNow, ShouldRescue
{
    public function __construct(
        private readonly int $branchId,
        private readonly ?int $stationId,
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
        return 'ComandaEnviada';
    }

    public function broadcastWith(): array
    {
        return ['comanda_id' => $this->ticketId, 'pedido_id' => $this->orderId, 'usuario_id' => $this->userId];
    }
}
