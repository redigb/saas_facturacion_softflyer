<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use BelongsToTenant, HasApiTokens, SoftDeletes;

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    public const DELETED_AT = 'eliminado_en';

    protected $table = 'usuarios';

    protected $authPasswordName = 'contrasena';

    // Solo usamos tokens de Sanctum; no hay "recordarme" por cookie.
    protected $rememberTokenName = '';

    protected $fillable = ['nombre', 'correo', 'contrasena', 'es_activo'];

    protected $hidden = ['contrasena', 'pin_hash'];

    /** @var list<string>|null */
    private ?array $permissionCodes = null;

    protected function casts(): array
    {
        return [
            'contrasena' => 'hashed',
            'es_activo' => 'boolean',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'rol_usuario', 'usuario_id', 'rol_id')
            ->withPivot('sucursal_id');
    }

    /**
     * Permisos de todos sus roles, en cualquier sucursal.
     *
     * @return list<string>
     */
    public function permissionCodes(): array
    {
        return $this->permissionCodes ??= DB::table('permisos')
            ->join('permiso_rol', 'permiso_rol.permiso_id', '=', 'permisos.id')
            ->join('rol_usuario', 'rol_usuario.rol_id', '=', 'permiso_rol.rol_id')
            ->where('rol_usuario.usuario_id', $this->getKey())
            ->distinct()
            ->orderBy('permisos.codigo')
            ->pluck('permisos.codigo')
            ->all();
    }

    public function hasPermission(string $code): bool
    {
        return in_array($code, $this->permissionCodes(), true);
    }
}
