<?php

namespace App\Core\Iam\Presentation\Resources;

use App\Core\Iam\Infrastructure\Persistence\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'correo' => $this->correo,
        ];
    }
}
