<?php

namespace App\Core\Iam\Presentation\Controllers;

use App\Core\Iam\Application\ManageTeam;
use App\Core\Iam\Infrastructure\Persistence\Role;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Iam\Presentation\Requests\TeamMemberRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Equipo del restaurante (spec 004, specs/004-equipo/backend.md). */
class TeamController
{
    public function __construct(private readonly ManageTeam $team) {}

    public function roles(): JsonResponse
    {
        $permissions = DB::table('permiso_rol')
            ->join('permisos', 'permisos.id', '=', 'permiso_rol.permiso_id')
            ->orderBy('permisos.codigo')
            ->get(['permiso_rol.rol_id', 'permisos.codigo'])
            ->groupBy('rol_id');

        return response()->json(['data' => Role::orderBy('id')->get()->map(fn (Role $role) => [
            'id' => $role->id,
            'nombre' => $role->nombre,
            'descripcion' => $role->descripcion,
            'es_sistema' => (bool) $role->es_sistema,
            'permisos' => $permissions->get($role->id)?->pluck('codigo')->values()->all() ?? [],
        ])]);
    }

    public function index(Request $request): JsonResponse
    {
        $users = User::with(['roles' => fn ($query) => $query->orderBy('nombre')])->orderByDesc('es_activo')->orderBy('nombre')->get();
        $lastAccess = DB::table('personal_access_tokens')
            ->where('tokenable_type', (new User)->getMorphClass())
            ->whereIn('tokenable_id', $users->modelKeys())
            ->groupBy('tokenable_id')
            ->selectRaw('tokenable_id, max(coalesce(last_used_at, created_at)) as ultimo')
            ->pluck('ultimo', 'tokenable_id');

        return response()->json(['data' => $users->map(fn (User $user) => $this->member($user, $request->user(), $lastAccess[$user->id] ?? null))]);
    }

    public function store(TeamMemberRequest $request): JsonResponse
    {
        $user = $this->team->create($request->validated());

        return response()->json(['data' => $this->member($user->load('roles'), $request->user(), null)], 201);
    }

    public function update(TeamMemberRequest $request, User $user): JsonResponse
    {
        // Doc. 06 §5: editar a alguien no es lo mismo que cambiarle el rol.
        if ($request->has('rol_ids') && ! $request->user()->hasPermission('usuarios.asignar_rol')) {
            throw new AccessDeniedHttpException;
        }

        $user = $this->team->update($request->user(), $user, $request->validated());

        return response()->json(['data' => $this->member($user->load('roles'), $request->user(), null)]);
    }

    public function setPin(Request $request, User $user): Response
    {
        $data = $request->validate(['pin' => ['required', 'digits_between:4,6']], [
            'pin.required' => 'Ingresa el PIN.',
            'pin.digits_between' => 'El PIN tiene de 4 a 6 dígitos.',
        ]);

        $this->team->setPin($user, $data['pin']);

        return response()->noContent();
    }

    public function removePin(User $user): Response
    {
        $this->team->setPin($user, null);

        return response()->noContent();
    }

    /** Quiénes pueden entrar con PIN en este dispositivo. */
    public function switchable(): JsonResponse
    {
        $users = User::with(['roles' => fn ($query) => $query->orderBy('nombre')])
            ->where('es_activo', true)
            ->whereNotNull('pin_hash')
            ->orderBy('nombre')
            ->get();

        return response()->json(['data' => $users->map(fn (User $user) => [
            'id' => $user->id,
            'nombre' => $user->nombre,
            'roles' => $user->roles->pluck('nombre')->all(),
        ])]);
    }

    private function member(User $user, User $actor, ?string $lastAccess): array
    {
        return [
            'id' => $user->id,
            'nombre' => $user->nombre,
            'correo' => $user->correo,
            'es_activo' => (bool) $user->es_activo,
            'tiene_pin' => $user->pin_hash !== null,
            'roles' => $user->roles->map(fn (Role $role) => ['id' => $role->id, 'nombre' => $role->nombre])->all(),
            'ultimo_acceso' => $lastAccess ? Carbon::parse($lastAccess)->utc()->toIso8601ZuluString() : null,
            'es_yo' => $actor->is($user),
        ];
    }
}
