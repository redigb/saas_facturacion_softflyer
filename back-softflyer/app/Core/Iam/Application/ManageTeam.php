<?php

namespace App\Core\Iam\Application;

use App\Core\Iam\Infrastructure\Persistence\Role;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Altas y cambios del equipo del restaurante (spec 004, Doc. 06 y Doc. 08 §4).
 * Los usuarios no se borran: tendran ventas y pedidos a su nombre.
 */
final class ManageTeam
{
    public const ADMIN_ROLE = 'Administrador';

    public function __construct(private readonly TenantContext $context) {}

    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $this->ensurePlanAllowsOneMore();

            $user = User::create([
                'nombre' => $data['nombre'],
                'correo' => $data['correo'],
                'contrasena' => $data['contrasena'],
                'es_activo' => true,
            ]);

            if (! empty($data['pin'])) {
                $user->forceFill(['pin_hash' => Hash::make($data['pin'])])->save();
            }

            $this->syncRoles($user, $data['rol_ids']);
            $this->refreshUsage();

            return $user;
        });
    }

    public function update(User $actor, User $user, array $data): User
    {
        return DB::transaction(function () use ($actor, $user, $data) {
            $deactivating = array_key_exists('es_activo', $data) && ! $data['es_activo'] && $user->es_activo;
            $reactivating = array_key_exists('es_activo', $data) && $data['es_activo'] && ! $user->es_activo;
            $losesAdmin = array_key_exists('rol_ids', $data) && $this->isAdmin($user) && ! $this->includesAdmin($data['rol_ids']);

            if ($actor->is($user) && ($deactivating || $losesAdmin)) {
                throw new BusinessException('ACCION_SOBRE_SI_MISMO', 'No puedes desactivarte ni quitarte el rol de Administrador a ti mismo.');
            }
            if (($deactivating || $losesAdmin) && $this->isAdmin($user) && $this->activeAdmins() <= 1) {
                throw new BusinessException('ULTIMO_ADMINISTRADOR', 'El restaurante necesita al menos un Administrador activo.');
            }
            if ($reactivating) {
                $this->ensurePlanAllowsOneMore();
            }

            $user->fill(Arr::only($data, ['nombre', 'correo', 'es_activo']));
            if (! empty($data['contrasena'])) {
                $user->contrasena = $data['contrasena'];
            }
            $user->save();

            if (array_key_exists('rol_ids', $data)) {
                $this->syncRoles($user, $data['rol_ids']);
            }

            // Quien ya no trabaja aqui, o cuya contrasena se restablecio, sale de todos sus dispositivos.
            if ($deactivating || ! empty($data['contrasena'])) {
                $user->tokens()->delete();
            }

            if ($deactivating || $reactivating) {
                $this->refreshUsage();
            }

            return $user;
        });
    }

    public function setPin(User $user, ?string $pin): void
    {
        $user->forceFill(['pin_hash' => $pin === null ? null : Hash::make($pin)])->save();
    }

    /** @param list<int> $roleIds */
    private function syncRoles(User $user, array $roleIds): void
    {
        DB::table('rol_usuario')->where('usuario_id', $user->id)->delete();

        DB::table('rol_usuario')->insert(array_map(fn (int $roleId) => [
            'inquilino_id' => $this->context->id(),
            'usuario_id' => $user->id,
            'rol_id' => $roleId,
            'sucursal_id' => null,
            'creado_en' => now(),
            'actualizado_en' => now(),
        ], array_values(array_unique($roleIds))));
    }

    private function isAdmin(User $user): bool
    {
        return $user->roles()->where('nombre', self::ADMIN_ROLE)->where('es_sistema', true)->exists();
    }

    private function includesAdmin(array $roleIds): bool
    {
        return Role::whereIn('id', $roleIds)->where('nombre', self::ADMIN_ROLE)->where('es_sistema', true)->exists();
    }

    private function activeAdmins(): int
    {
        return User::where('es_activo', true)
            ->whereHas('roles', fn ($query) => $query->where('nombre', self::ADMIN_ROLE)->where('es_sistema', true))
            ->count();
    }

    private function ensurePlanAllowsOneMore(): void
    {
        $limit = Subscription::with('plan')->latest('fecha_inicio')->latest('id')->first()?->plan?->max_usuarios;

        if ($limit !== null && User::where('es_activo', true)->count() >= $limit) {
            throw new BusinessException(
                'LIMITE_PLAN_ALCANZADO',
                "Tu plan permite hasta {$limit} usuarios activos. Desactiva a alguien o mejora tu plan.",
                429,
            );
        }
    }

    /** Mantiene el contador del mes (Doc. 03 §5) para reportes y el backoffice. */
    private function refreshUsage(): void
    {
        DB::table('uso_inquilino')->upsert(
            [[
                'inquilino_id' => $this->context->id(),
                'periodo' => today()->format('Y-m'),
                'usuarios_activos' => User::where('es_activo', true)->count(),
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]],
            ['inquilino_id', 'periodo'],
            ['usuarios_activos', 'actualizado_en'],
        );
    }
}
