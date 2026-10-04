<?php

namespace App\Core\Iam\Presentation\Controllers;

use App\Core\Iam\Application\LoginUser;
use App\Core\Iam\Presentation\Requests\LoginRequest;
use App\Core\Iam\Presentation\Resources\UserResource;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Core\Tenancy\Presentation\Resources\TenantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
            ],
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
