<?php

namespace App\Modules\Assistant\Presentation\Controllers;

use App\Modules\Assistant\Application\AskAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Chat del asistente IA del restaurante (spec 040). */
class AssistantController
{
    public function __construct(private readonly AskAssistant $assistant) {}

    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mensaje' => ['required', 'string', 'max:500'],
        ], [
            'mensaje.required' => 'Escribe una pregunta.',
            'mensaje.max' => 'La pregunta no puede superar los 500 caracteres.',
        ]);

        return response()->json(['data' => $this->assistant->handle($request->user(), trim($data['mensaje']))]);
    }
}
