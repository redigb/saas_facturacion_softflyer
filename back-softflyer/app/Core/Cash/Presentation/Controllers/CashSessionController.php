<?php

namespace App\Core\Cash\Presentation\Controllers;

use App\Core\Cash\Application\ManageCashSessions;
use App\Core\Cash\Infrastructure\Persistence\CashMovement;
use App\Core\Cash\Infrastructure\Persistence\CashSession;
use App\Core\Cash\Infrastructure\Realtime\CashUpdated;
use App\Shared\Domain\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Turnos de caja (spec 009, specs/009-caja-cobro/backend.md). */
class CashSessionController
{
    public function __construct(private readonly ManageCashSessions $cash) {}

    public function current(Request $request): JsonResponse
    {
        $session = $this->cash->current($request->user());

        return response()->json(['data' => $session ? $this->present($session) : null]);
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'monto_apertura' => ['required', 'numeric', 'min:0', 'max:9999999.99', 'decimal:0,2'],
            'sucursal_id' => ['sometimes', 'integer'],
            'caja_id' => ['sometimes', 'integer'],
        ], ['monto_apertura.required' => 'Indica con cuánto abres la caja.']);

        $session = $this->cash->open($request->user(), $data['sucursal_id'] ?? null, $data['caja_id'] ?? null, (string) $data['monto_apertura']);
        $this->notify($session, $request);

        return response()->json(['data' => $this->present($session)], 201);
    }

    public function history(Request $request): JsonResponse
    {
        $data = $request->validate(['limite' => ['sometimes', 'integer', 'min:1', 'max:50']]);

        return response()->json(['data' => $this->cash->history($request->user(), (int) ($data['limite'] ?? 10))
            ->map(fn (CashSession $session) => $this->present($session) + ['resumen' => $this->cash->summary($session)])
            ->values()->all()]);
    }

    public function summary(Request $request, CashSession $cashSession): JsonResponse
    {
        $cashSession->load('register');
        $this->cash->ensureWorksAt($request->user(), $cashSession->register->sucursal_id);

        $methods = DB::table('metodos_pago')
            ->whereIn('id', $cashSession->movements->pluck('metodo_pago_id')->filter()->unique())
            ->get()->keyBy('id');

        return response()->json(['data' => $this->present($cashSession) + [
            'resumen' => $this->cash->summary($cashSession),
            'movimientos' => $cashSession->movements->map(fn (CashMovement $movement) => [
                'id' => $movement->id,
                'tipo' => $movement->tipo,
                'monto' => $movement->monto,
                'concepto' => $movement->concepto,
                'categoria' => $movement->categoria,
                'metodo_pago_id' => $movement->metodo_pago_id,
                'metodo' => $movement->metodo_pago_id !== null ? ($methods[$movement->metodo_pago_id]->nombre ?? null) : 'Efectivo',
                'es_efectivo' => $movement->metodo_pago_id === null || (bool) ($methods[$movement->metodo_pago_id]->es_efectivo ?? true),
                'creado_en' => $movement->creado_en?->utc()->toIso8601ZuluString(),
            ])->all(),
        ]]);
    }

    public function addMovement(Request $request, CashSession $cashSession): JsonResponse
    {
        $data = $request->validate([
            'tipo' => ['required', Rule::in([CashMovement::INCOME, CashMovement::EXPENSE])],
            'monto' => ['required', 'numeric', 'gt:0', 'max:9999999.99', 'decimal:0,2'],
            'concepto' => ['required', 'string', 'max:120'],
            'categoria' => ['nullable', 'string', Rule::in(['SALARIOS', 'ABARROTES', 'SERVICIOS', 'INSUMOS', 'MANTENIMIENTO', 'OTROS', 'RETIRO', 'INGRESO'])],
            'metodo_pago_id' => ['nullable', 'integer', Rule::exists('metodos_pago', 'id')->where('es_activo', true)],
        ], ['concepto.required' => 'Escribe el concepto del movimiento.']);

        // Spec 038: solo un gasto puede pagarse con Yape, Plin u otro método digital.
        if (($data['metodo_pago_id'] ?? null) !== null && $data['tipo'] !== CashMovement::EXPENSE) {
            $cash = DB::table('metodos_pago')->where('id', $data['metodo_pago_id'])->value('es_efectivo');
            if (! $cash) {
                throw ValidationException::withMessages(['metodo_pago_id' => ['Solo los gastos pueden usar un método digital.']]);
            }
        }

        $movement = $this->cash->addMovement(
            $request->user(),
            $cashSession,
            $data['tipo'],
            (string) $data['monto'],
            $data['concepto'],
            $data['categoria'] ?? null,
            $data['metodo_pago_id'] ?? null,
        );
        $this->notify($cashSession->load('register'), $request);

        return response()->json(['data' => [
            'id' => $movement->id,
            'tipo' => $movement->tipo,
            'monto' => $movement->monto,
            'concepto' => $movement->concepto,
            'categoria' => $movement->categoria,
            'metodo_pago_id' => $movement->metodo_pago_id,
            'efectivo_esperado' => Money::format($this->cash->expectedCash($cashSession)),
        ]], 201);
    }

    public function close(Request $request, CashSession $cashSession): JsonResponse
    {
        $data = $request->validate([
            'monto_cierre_declarado' => ['required', 'numeric', 'min:0', 'max:9999999.99', 'decimal:0,2'],
        ], ['monto_cierre_declarado.required' => 'Indica cuánto efectivo contaste.']);

        $session = $this->cash->close($request->user(), $cashSession, (string) $data['monto_cierre_declarado']);
        $this->notify($session, $request);

        return response()->json(['data' => $this->present($session) + ['resumen' => $this->cash->summary($session)]]);
    }

    private function notify(CashSession $session, Request $request): void
    {
        event(new CashUpdated($session->register->sucursal_id, $session->id, $request->user()->id));
    }

    private function present(CashSession $session): array
    {
        $session->loadMissing('register', 'opener');
        $closed = $session->estado === CashSession::CLOSED;

        return [
            'id' => $session->id,
            'sucursal_id' => $session->register->sucursal_id,
            'caja' => ['id' => $session->register->id, 'nombre' => $session->register->nombre],
            'estado' => $session->estado,
            'abierta_por' => ['id' => $session->abierta_por, 'nombre' => $session->opener?->nombre],
            'abierta_en' => $session->abierta_en->utc()->toIso8601ZuluString(),
            'monto_apertura' => $session->monto_apertura,
            'cerrada_en' => $session->cerrada_en?->utc()->toIso8601ZuluString(),
            'monto_cierre_declarado' => $session->monto_cierre_declarado,
            'monto_cierre_calculado' => $session->monto_cierre_calculado,
            'diferencia' => $closed ? Money::format(Money::cents($session->monto_cierre_declarado) - Money::cents($session->monto_cierre_calculado)) : null,
        ];
    }
}
