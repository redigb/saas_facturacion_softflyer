<?php

namespace App\Core\Iam\Presentation\Controllers;

use App\Core\Iam\Application\LoginUser;
use App\Core\Iam\Application\SwitchUserWithPin;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Iam\Presentation\Requests\LoginRequest;
use App\Core\Iam\Presentation\Resources\UserResource;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Core\Tenancy\Presentation\Resources\TenantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\NewAccessToken;

class AuthController
{
    public function __construct(private readonly TenantContext $context) {}

    public function login(LoginRequest $request, LoginUser $loginUser): JsonResponse
    {
        ['user' => $user, 'token' => $token] = $loginUser->handle(
            $request->email(),
            $request->string('contrasena'),
            $request->input('dispositivo') ?? 'web',
        );

        return $this->session($user, $token);
    }

    /** Cambio de usuario con PIN en un dispositivo ya autenticado (spec 004). */
    public function pin(Request $request, SwitchUserWithPin $switch): JsonResponse
    {
        $data = $request->validate([
            'usuario_id' => ['required', 'integer'],
            'pin' => ['required', 'string', 'max:6'],
            'dispositivo' => ['nullable', 'string', 'max:100'],
        ]);

        ['user' => $user, 'token' => $token] = $switch->handle(
            $request->user()->currentAccessToken(),
            (int) $data['usuario_id'],
            $data['pin'],
            $data['dispositivo'] ?? 'web',
        );

        return $this->session($user, $token);
    }

    private function session(User $user, NewAccessToken $token): JsonResponse
    {
        return response()->json([
            'data' => [
                'token' => $token->plainTextToken,
                'tipo_token' => 'Bearer',
                'expira_en' => $token->accessToken->expires_at?->toIso8601ZuluString(),
                'usuario' => new UserResource($user),
                'inquilino' => new TenantResource($this->context->tenant()),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'usuario' => new UserResource($user),
                'inquilino' => new TenantResource($this->context->tenant()),
                'roles' => $user->roles()->orderBy('nombre')->pluck('nombre'),
                'permisos' => $user->permissionCodes(),
                // Para suscribirse a los canales en tiempo real de cada sucursal (spec 005).
                'sucursales' => $user->branches()->map->only(['id', 'nombre'])->values(),
            ],
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
