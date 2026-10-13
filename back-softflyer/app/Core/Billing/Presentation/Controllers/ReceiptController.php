<?php

namespace App\Core\Billing\Presentation\Controllers;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Billing\Presentation\ReceiptPresenter;
use App\Core\Cash\Infrastructure\Persistence\CashSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Comprobantes emitidos (spec 010, specs/010-comprobante-simulado/backend.md). */
class ReceiptController
{
    public function __construct(private readonly ReceiptPresenter $presenter) {}

    /** Los del turno indicado, o los del turno abierto del usuario. */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['sesion_caja_id' => ['sometimes', 'integer']]);
        $user = $request->user();

        $sessionId = $data['sesion_caja_id'] ?? CashSession::where('abierta_por', $user->id)->where('estado', CashSession::OPEN)->value('id');
        if ($sessionId === null) {
            return response()->json(['data' => []]);
        }

        $receipts = Receipt::whereIn('venta_id', DB::table('ventas')->where('sesion_caja_id', $sessionId)->select('id'))
            ->whereIn('sucursal_id', $user->branches()->modelKeys())
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return response()->json(['data' => $this->presenter->many($receipts)]);
    }

    public function show(Request $request, Receipt $receipt): JsonResponse
    {
        if (! $request->user()->worksAt($receipt->sucursal_id)) {
            throw new AccessDeniedHttpException;
        }

        return response()->json(['data' => $this->presenter->one($receipt)]);
    }
}
