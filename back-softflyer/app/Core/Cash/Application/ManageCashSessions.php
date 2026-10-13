<?php

namespace App\Core\Cash\Application;

use App\Core\Cash\Infrastructure\Persistence\CashMovement;
use App\Core\Cash\Infrastructure\Persistence\CashRegister;
use App\Core\Cash\Infrastructure\Persistence\CashSession;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Shared\Domain\Money;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Turnos de caja (spec 009, Doc. 08 §10): apertura, movimientos manuales y arqueo.
 * El turno pertenece a quien lo abrió: solo esa persona cobra y cierra en él.
 */
final class ManageCashSessions
{
    public const DEFAULT_REGISTER = 'Caja principal';

    public function current(User $user): ?CashSession
    {
        return CashSession::with('register')
            ->where('abierta_por', $user->id)
            ->where('estado', CashSession::OPEN)
            ->first();
    }

    /** El turno abierto del usuario, o error si no abrió caja. */
    public function requireOpen(User $user): CashSession
    {
        return $this->current($user) ?? throw new BusinessException('SIN_TURNO_ABIERTO', 'Abre tu caja para cobrar.');
    }

    public function open(User $user, ?int $branchId, ?int $registerId, string $amount): CashSession
    {
        if ($this->current($user) !== null) {
            throw $this->alreadyOpen($user);
        }

        $register = $registerId !== null
            ? CashRegister::where('es_activa', true)->findOrFail($registerId)
            : $this->defaultRegister($user, $branchId);

        $this->ensureWorksAt($user, $register->sucursal_id);

        try {
            return DB::transaction(function () use ($user, $register, $amount) {
                // Serializa la apertura de una misma caja.
                CashRegister::whereKey($register->id)->lockForUpdate()->first();

                if (CashSession::where('caja_id', $register->id)->where('estado', CashSession::OPEN)->exists()) {
                    throw new BusinessException('CAJA_YA_ABIERTA', 'Esta caja ya tiene un turno abierto por otra persona.');
                }

                return CashSession::create([
                    'caja_id' => $register->id,
                    'abierta_por' => $user->id,
                    'abierta_en' => now(),
                    'monto_apertura' => $amount,
                    'estado' => CashSession::OPEN,
                ])->load('register');
            });
        } catch (QueryException $e) {
            // 23505: otra apertura ganó la carrera por el índice único parcial.
            if ($e->getCode() === '23505') {
                throw $this->alreadyOpen($user);
            }
            throw $e;
        }
    }

    public function addMovement(User $user, CashSession $session, string $type, string $amount, string $concept): CashMovement
    {
        return DB::transaction(function () use ($user, $session, $type, $amount, $concept) {
            $this->lockOwnOpen($user, $session);

            return CashMovement::create([
                'sesion_caja_id' => $session->id,
                'tipo' => $type,
                'monto' => $amount,
                'concepto' => trim($concept),
                'usuario_id' => $user->id,
            ]);
        });
    }

    /** Cierra el turno: guarda la foto del efectivo esperado junto a lo que contó el cajero. */
    public function close(User $user, CashSession $session, string $declared): CashSession
    {
        return DB::transaction(function () use ($user, $session, $declared) {
            $session = $this->lockOwnOpen($user, $session);

            $session->update([
                'estado' => CashSession::CLOSED,
                'cerrada_por' => $user->id,
                'cerrada_en' => now(),
                'monto_cierre_declarado' => $declared,
                'monto_cierre_calculado' => Money::format($this->expectedCash($session)),
            ]);

            return $session->load('register');
        });
    }

    /**
     * Efectivo esperado en céntimos (Doc. 08 §10). `pagos.monto` ya es lo aplicado a la
     * venta, sin vuelto, así que no hay nada más que restar por vueltos.
     */
    public function expectedCash(CashSession $session): int
    {
        $cash = Money::cents(DB::table('pagos')
            ->join('metodos_pago', 'metodos_pago.id', '=', 'pagos.metodo_pago_id')
            ->where('pagos.sesion_caja_id', $session->id)
            ->where('metodos_pago.es_efectivo', true)
            ->sum('pagos.monto'));

        return Money::cents($session->monto_apertura) + $cash + $this->movementTotal($session, CashMovement::INCOME) - $this->movementTotal($session, CashMovement::EXPENSE);
    }

    /** @return array{ventas: array{cantidad: int, total: string}, por_metodo: list<array<string, mixed>>, ingresos: string, egresos: string, efectivo_esperado: string} */
    public function summary(CashSession $session): array
    {
        $byMethod = DB::table('pagos')
            ->join('metodos_pago', 'metodos_pago.id', '=', 'pagos.metodo_pago_id')
            ->where('pagos.sesion_caja_id', $session->id)
            ->groupBy('metodos_pago.id', 'metodos_pago.codigo', 'metodos_pago.nombre', 'metodos_pago.es_efectivo')
            ->orderBy('metodos_pago.id')
            ->selectRaw('metodos_pago.id as metodo_pago_id, metodos_pago.codigo, metodos_pago.nombre, metodos_pago.es_efectivo, sum(pagos.monto) as monto, count(*) as cantidad')
            ->get();

        $sales = DB::table('ventas')->where('sesion_caja_id', $session->id)->where('estado', 'EMITIDA');

        return [
            'ventas' => ['cantidad' => (int) $sales->count(), 'total' => Money::format(Money::cents($sales->sum('total')))],
            'por_metodo' => $byMethod->map(fn ($row) => [
                'metodo_pago_id' => (int) $row->metodo_pago_id,
                'codigo' => $row->codigo,
                'nombre' => $row->nombre,
                'monto' => Money::format(Money::cents($row->monto)),
                'cantidad' => (int) $row->cantidad,
            ])->all(),
            'ingresos' => Money::format($this->movementTotal($session, CashMovement::INCOME)),
            'egresos' => Money::format($this->movementTotal($session, CashMovement::EXPENSE)),
            'efectivo_esperado' => Money::format($this->expectedCash($session)),
        ];
    }

    /** Doc. 06 §6: el rol vale en las sucursales de su asignación. */
    public function ensureWorksAt(User $user, int $branchId): void
    {
        if (! $user->worksAt($branchId)) {
            throw new AccessDeniedHttpException;
        }
    }

    private function lockOwnOpen(User $user, CashSession $session): CashSession
    {
        $session = CashSession::whereKey($session->id)->lockForUpdate()->firstOrFail();

        if ($session->abierta_por !== $user->id) {
            throw new AccessDeniedHttpException;
        }
        if ($session->estado !== CashSession::OPEN) {
            throw new BusinessException('SESION_CERRADA', 'Este turno de caja ya está cerrado.');
        }

        return $session;
    }

    private function movementTotal(CashSession $session, string $type): int
    {
        return Money::cents(CashMovement::where('sesion_caja_id', $session->id)->where('tipo', $type)->sum('monto'));
    }

    private function defaultRegister(User $user, ?int $branchId): CashRegister
    {
        $branchId ??= $user->branches()->first()?->id ?? throw new AccessDeniedHttpException;
        $this->ensureWorksAt($user, $branchId);

        return CashRegister::where('sucursal_id', $branchId)->where('es_activa', true)->orderBy('id')->first()
            ?? CashRegister::create(['sucursal_id' => $branchId, 'nombre' => self::DEFAULT_REGISTER]);
    }

    private function alreadyOpen(User $user): BusinessException
    {
        return new BusinessException('CAJA_YA_ABIERTA', 'Ya tienes una caja abierta.', 409, ['sesion_id' => $this->current($user)?->id]);
    }
}
