<?php

namespace App\Core\Billing\Presentation\Controllers;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Billing\Presentation\ReceiptPresenter;
use App\Core\Cash\Infrastructure\Persistence\CashSession;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Comprobantes emitidos (spec 010 y spec 037, specs/037-facturacion-usable/backend.md). */
class ReceiptController
{
    /** Grupos del filtro de estado de la pantalla "Facturación". */
    private const STATUS_GROUPS = [
        'ACEPTADOS' => [Receipt::ACCEPTED, Receipt::OBSERVED],
        'EN_PROCESO' => [Receipt::PENDING, Receipt::SENT, Receipt::NO_CDR],
        'CON_PROBLEMAS' => [Receipt::REJECTED, Receipt::EXPIRED],
    ];

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

    /** Historial de la pantalla "Facturación": los de los locales del usuario, con filtros y páginas. */
    public function history(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'desde' => ['sometimes', 'date_format:Y-m-d'],
            'hasta' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:desde'],
            'tipo' => ['sometimes', 'in:BOLETA,FACTURA'],
            'estado' => ['sometimes', 'in:ACEPTADOS,EN_PROCESO,CON_PROBLEMAS,SIMULADOS'],
            'buscar' => ['sometimes', 'nullable', 'string', 'max:100'],
            'pagina' => ['sometimes', 'integer', 'min:1'],
            'por_pagina' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $page = Receipt::query()
            ->whereIn('sucursal_id', $request->user()->branches()->modelKeys())
            // Las fechas del filtro son días de Lima; emitido_en se guarda en UTC.
            ->when($filters['desde'] ?? null, fn (Builder $query, string $day) => $query->where('emitido_en', '>=', Carbon::parse($day, Receipt::TIMEZONE)->startOfDay()->utc()))
            ->when($filters['hasta'] ?? null, fn (Builder $query, string $day) => $query->where('emitido_en', '<', Carbon::parse($day, Receipt::TIMEZONE)->addDay()->startOfDay()->utc()))
            ->when($filters['tipo'] ?? null, fn (Builder $query, string $type) => $query->whereIn('tipo_comprobante_id', DB::table('tipos_comprobante')->where('codigo', $type === 'FACTURA' ? '01' : '03')->select('id')))
            ->when($filters['estado'] ?? null, fn (Builder $query, string $status) => $status === 'SIMULADOS'
                ? $query->where('es_simulado', true)
                : $query->where('es_simulado', false)->whereIn('estado', self::STATUS_GROUPS[$status]))
            ->when(trim((string) ($filters['buscar'] ?? '')), fn (Builder $query, string $term) => $this->search($query, $term))
            ->orderByDesc('emitido_en')
            ->orderByDesc('id')
            ->paginate($filters['por_pagina'] ?? 20, ['*'], 'pagina', $filters['pagina'] ?? 1);

        return response()->json([
            'data' => $this->presenter->many($page->getCollection()),
            'meta' => [
                'pagina_actual' => $page->currentPage(),
                'por_pagina' => $page->perPage(),
                'total' => $page->total(),
                'ultima_pagina' => $page->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, Receipt $receipt): JsonResponse
    {
        $this->authorizeBranch($request, $receipt);

        return response()->json(['data' => $this->presenter->one($receipt)]);
    }

    public function xml(Request $request, Receipt $receipt): StreamedResponse
    {
        return $this->download($request, $receipt, $receipt->ruta_xml);
    }

    public function cdr(Request $request, Receipt $receipt): StreamedResponse
    {
        return $this->download($request, $receipt, $receipt->ruta_cdr);
    }

    private function download(Request $request, Receipt $receipt, ?string $path): StreamedResponse
    {
        $this->authorizeBranch($request, $receipt);

        if ($path === null || ! Storage::disk('local')->exists($path)) {
            throw new NotFoundHttpException('SUNAT aún no responde por este comprobante.');
        }

        // SUNAT nombra la constancia R-{RUC}-{tipo}-{serie}-{número}.zip; se descarga con ese nombre.
        $name = basename($path);
        if (str_ends_with($name, '-cdr.zip')) {
            $name = 'R-'.substr($name, 0, -strlen('-cdr.zip')).'.zip';
        }

        return Storage::disk('local')->download($path, $name);
    }

    /** «B001-12», un número de documento o parte del nombre del cliente. */
    private function search(Builder $query, string $term): void
    {
        if (preg_match('/^([A-Za-z][A-Za-z0-9]{3})-0*(\d{1,8})$/', $term, $match)) {
            $query->where('serie', strtoupper($match[1]))->where('correlativo', (int) $match[2]);

            return;
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
        $query->where(fn (Builder $query) => $query
            ->where('cliente_nombre', 'ilike', $like)
            ->orWhere('cliente_numero_documento', 'like', $like)
            ->when(ctype_digit($term) && strlen($term) <= 8, fn (Builder $query) => $query->orWhere('correlativo', (int) $term)));
    }

    private function authorizeBranch(Request $request, Receipt $receipt): void
    {
        if (! $request->user()->worksAt($receipt->sucursal_id)) {
            throw new AccessDeniedHttpException;
        }
    }
}
