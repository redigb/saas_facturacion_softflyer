<?php

namespace App\Core\Billing\Presentation\Controllers;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use Illuminate\Http\JsonResponse;

/**
 * Lo que el dueño ve de su facturación (solo lectura). Certificado, clave SOL, tasa y exoneración de la Amazonía
 * los administra el backoffice: no existen endpoints del dueño para cambiarlos (specs/017b-emision-greenter).
 */
class FiscalConfigurationController
{
    public function __construct(private readonly ManageFiscalConfiguration $fiscal) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->fiscal->status()]);
    }
}
