<?php

namespace App\Platform\Infrastructure\Persistence;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Administrador del backoffice (dueno y equipo de Softflyer). No pertenece a ningun inquilino.
 */
class PlatformAdmin extends Authenticatable
{
    use HasApiTokens;

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $table = 'administradores_plataforma';

    protected $authPasswordName = 'contrasena';

    protected $rememberTokenName = '';

    protected $fillable = ['nombre', 'correo', 'contrasena', 'es_activo'];

    protected $hidden = ['contrasena'];

    protected function casts(): array
    {
        return [
            'contrasena' => 'hashed',
            'es_activo' => 'boolean',
            'ultimo_acceso_en' => 'datetime',
        ];
    }
}
