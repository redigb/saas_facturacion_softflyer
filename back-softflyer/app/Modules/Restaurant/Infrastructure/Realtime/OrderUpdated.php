<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/** Un pedido cambió: se abrió, se enviaron platos, se pidió la cuenta… (spec 006). */
final class OrderUpdated implements ShouldBroadcastNow, ShouldRescue
{
    /** @param list<int> $tableIds */
    public function __construct(
        private readonly int $branchId,
        private readonly int $orderId,
        private readonly array $tableIds,
        private readonly string $status,
        private readonly int $version,
        private readonly int $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("sucursal.{$this->branchId}.salon");
    }

    public function broadcastAs(): string
    {
        return 'PedidoActualizado';
    }

    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->orderId,
            'mesa_ids' => $this->tableIds,
            'estado' => $this->status,
            'version' => $this->version,
            'usuario_id' => $this->userId,
        ];
    }
}
