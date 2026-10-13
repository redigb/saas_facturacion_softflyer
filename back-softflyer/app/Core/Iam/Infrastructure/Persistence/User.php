<?php

namespace App\Core\Iam\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use Illuminate\Database\Eloquent\Collection;
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

    /** @var Collection<int, Branch>|null */
    private ?Collection $branches = null;

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

    /**
     * Sucursales activas donde trabaja: todas si tiene un rol global (sucursal_id nulo),
     * si no, las de sus roles (Doc. 06 §6, Doc. 08 §4).
     *
     * @return Collection<int, Branch>
     */
    public function branches(): Collection
    {
        // Memoizada por instancia: autorizar varios canales en una petición consulta una sola vez.
        return $this->branches ??= $this->loadBranches();
    }

    /** @return Collection<int, Branch> */
    private function loadBranches(): Collection
    {
        $scopes = DB::table('rol_usuario')->where('usuario_id', $this->getKey())->pluck('sucursal_id');

        return Branch::where('es_activa', true)
            ->when(! $scopes->contains(null), fn ($query) => $query->whereIn('id', $scopes->filter()))
            ->orderByDesc('es_principal')
            ->orderBy('id')
            ->get();
    }

    public function worksAt(int $branchId): bool
    {
        return $this->branches()->contains('id', $branchId);
    }
}
