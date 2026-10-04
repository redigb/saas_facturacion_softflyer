<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'suscripciones';

    protected function casts(): array
    {
        return ['fecha_inicio' => 'date', 'fecha_vencimiento' => 'date'];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
