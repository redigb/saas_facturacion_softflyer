<?php

namespace App\Modules\Restaurant\Infrastructure\Realtime;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;

/** "Plato listo" al celular del mozo del pedido (spec 007, Doc. 08 §8). */
final class DishReady implements ShouldBroadcastNow, ShouldRescue
{
    /**
     * @param  list<int>  $itemIds
     * @param  list<string>  $dishes  "2× Lomo saltado"
     */
    public function __construct(
        private readonly int $branchId,
        private readonly int $waiterId,
        private readonly int $orderId,
        private readonly array $itemIds,
        private readonly ?string $table,
        private readonly array $dishes,
        private readonly int $userId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("sucursal.{$this->branchId}.mozo.{$this->waiterId}");
    }

    public function broadcastAs(): string
    {
        return 'PlatoListo';
    }

    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->orderId,
            'detalle_ids' => $this->itemIds,
            'mesa' => $this->table,
            'platos' => $this->dishes,
            'usuario_id' => $this->userId,
        ];
    }
}
