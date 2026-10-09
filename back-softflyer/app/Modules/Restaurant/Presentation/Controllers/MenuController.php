<?php

namespace App\Modules\Restaurant\Presentation\Controllers;

use App\Core\Billing\Infrastructure\Persistence\IgvAffectationType;
use App\Core\Billing\Infrastructure\Persistence\UnitOfMeasure;
use App\Modules\Restaurant\Application\GetMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MenuController
{
    /** Carta del mozo. Con If-None-Match y sin cambios responde 304 sin cuerpo. */
    public function show(Request $request, GetMenu $menu): Response
    {
        $payload = ['data' => $menu->handle()];
        $etag = hash('xxh128', json_encode($payload));

        if (in_array('"'.$etag.'"', $request->getETags(), true)) {
            return response()->noContent(304)->setEtag($etag);
        }

        return response()->json($payload)->setEtag($etag);
    }

    public function catalogs(): JsonResponse
    {
        return response()->json(['data' => [
            'unidades_medida' => UnitOfMeasure::where('es_activo', true)->orderBy('id')->get(['id', 'codigo', 'nombre']),
            'tipos_afectacion_igv' => IgvAffectationType::where('es_activo', true)->orderBy('codigo')->get(['id', 'codigo', 'nombre']),
        ]]);
    }
}
