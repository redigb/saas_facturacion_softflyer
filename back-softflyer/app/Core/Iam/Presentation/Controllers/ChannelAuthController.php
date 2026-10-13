<?php

namespace App\Core\Iam\Presentation\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Autoriza varios canales privados en una peticion (spec 008, specs/008-tiempo-real-eficiente/backend.md). */
class ChannelAuthController
{
    public function batch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'socket_id' => ['required', 'string'],
            'canales' => ['required', 'array', 'min:1', 'max:20'],
            'canales.*' => ['required', 'string', 'distinct', 'starts_with:private-'],
        ]);

        $result = [];
        foreach ($data['canales'] as $channel) {
            $result[$channel] = $this->authorize($request, $data['socket_id'], $channel);
        }

        return response()->json(['data' => $result]);
    }

    /** @return array<string, mixed>|null La firma de Reverb, o null si el canal no esta autorizado. */
    private function authorize(Request $request, string $socketId, string $channel): ?array
    {
        // Peticion nueva y no un duplicado: un duplicado JSON seguiria leyendo el cuerpo original.
        $single = Request::create('/', 'POST', ['socket_id' => $socketId, 'channel_name' => $channel]);
        $single->setUserResolver($request->getUserResolver());

        try {
            $response = Broadcast::auth($single);
        } catch (AccessDeniedHttpException) {
            return null;
        }

        return is_string($response) ? json_decode($response, true) : (array) $response;
    }
}
