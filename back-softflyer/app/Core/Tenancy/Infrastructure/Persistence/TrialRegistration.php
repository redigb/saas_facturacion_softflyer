<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Shared\Infrastructure\Persistence\BaseModel;

// Global: una solicitud de prueba todavia no pertenece a ningun inquilino.
class TrialRegistration extends BaseModel
{
    protected $table = 'registros_prueba';

    protected $guarded = ['id'];

    protected $hidden = ['contrasena_hash', 'token_hash'];

    protected function casts(): array
    {
        return ['token_expira_en' => 'datetime', 'verificado_en' => 'datetime'];
    }
}
