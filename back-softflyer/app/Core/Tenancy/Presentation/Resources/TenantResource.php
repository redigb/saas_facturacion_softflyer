<?php

namespace App\Core\Tenancy\Presentation\Resources;

use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tenant */
class TenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'nombre' => $this->nombre,
            'slug' => $this->slug,
            'estado' => $this->estado->value,
            'modo' => $this->mode()->value,
            'prueba' => $this->trial(),
            'ventas_correo' => config('softflyer.ventas.correo'),
        ];
    }
}
