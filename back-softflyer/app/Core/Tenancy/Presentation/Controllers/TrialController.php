<?php

namespace App\Core\Tenancy\Presentation\Controllers;

use App\Core\Tenancy\Application\RegisterTrial;
use App\Core\Tenancy\Application\VerifyTrial;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Core\Tenancy\Presentation\Requests\RegisterTrialRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Registro de prueba gratis. Corre en el dominio central: todavia no hay inquilino.
 */
class TrialController
{
    public function register(RegisterTrialRequest $request, RegisterTrial $registerTrial): JsonResponse
    {
        $registration = $registerTrial->handle($request->validated(), $request->ip());

        return response()->json(['data' => [
            'correo' => $registration->correo,
            'slug' => $registration->slug,
        ]], 201);
    }

    public function verify(Request $request, VerifyTrial $verifyTrial): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'size:64']]);
        $tenant = $verifyTrial->handle($data['token']);

        return response()->json(['data' => [
            'slug' => $tenant->slug,
            'nombre' => $tenant->nombre,
        ]]);
    }

    /**
     * Siempre responde igual, exista o no la solicitud, para no revelar que correos se registraron.
     */
    public function resend(Request $request, RegisterTrial $registerTrial): JsonResponse
    {
        $data = $request->validate(['correo' => ['required', 'email']]);

        $registration = TrialRegistration::where('correo', mb_strtolower($data['correo']))
            ->whereNull('verificado_en')
            ->latest('creado_en')
            ->first();

        if ($registration !== null) {
            $registerTrial->sendVerification($registration);
        }

        return response()->json(['data' => ['enviado' => true]]);
    }
}
