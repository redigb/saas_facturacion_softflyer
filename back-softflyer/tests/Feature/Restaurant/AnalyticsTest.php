<?php

namespace Tests\Feature\Restaurant;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 039: tablero de analíticas de ventas. */
class AnalyticsTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private int $branch;

    private int $secondBranch;

    private int $session;

    private int $secondSession;

    private int $cashierId;

    private int $affectation;

    /** @var array<string, int> */
    private array $methods = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->methods = DB::table('metodos_pago')->pluck('id', 'codigo')->all();
        $this->branch = $this->ids['sucursal'];

        $ids = $this->asTenant(fn () => [
            'admin' => (int) DB::table('usuarios')->where('correo', 'admin@donjose.pe')->value('id'),
            'empresa' => (int) DB::table('empresas')->value('id'),
            'afectacion' => (int) DB::table('tipos_afectacion_igv')->where('codigo', '10')->value('id'),
        ]);
        $this->cashierId = $ids['admin'];
        $this->affectation = $ids['afectacion'];

        $this->secondBranch = $this->asTenant(fn () => DB::table('sucursales')->insertGetId([
            'inquilino_id' => $this->tenant->id,
            'empresa_id' => $ids['empresa'],
            'nombre' => 'Segundo local',
            'es_principal' => false,
        ]));

        $this->session = $this->cashSession($this->branch, $this->cashierId);
        // Una persona no puede tener dos turnos abiertos: el segundo local abre con otra cajera.
        $this->user('Cajero', 'caja2@donjose.pe');
        $secondOpener = $this->asTenant(fn () => (int) DB::table('usuarios')->where('correo', 'caja2@donjose.pe')->value('id'));
        $this->secondSession = $this->cashSession($this->secondBranch, $secondOpener);
    }

    public function test_kpis_series_and_breakdowns_use_the_selected_range(): void
    {
        $this->sale('2026-01-15 13:00:00', $this->session, [
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 2, 'total' => 100],
        ]);
        $this->sale('2026-02-10 20:00:00', $this->session, [
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1, 'total' => 50],
        ]);
        $this->sale('2025-12-31 21:00:00', $this->session, [
            ['producto_id' => $this->ids['lomo'], 'cantidad' => 3, 'total' => 200],
        ]);
        $this->sale('2026-03-05 12:00:00', $this->secondSession, [
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1, 'total' => 70],
        ]);

        $response = $this->as($this->admin, 'GET', 'analiticas?desde=2026-01-01&hasta=2026-12-31')->assertOk();

        $response->assertJsonPath('data.kpis.ventas', '220.00')
            ->assertJsonPath('data.kpis.ordenes', 3)
            ->assertJsonPath('data.kpis.ticket_promedio', '73.33')
            ->assertJsonPath('data.kpis.platos', 4)
            ->assertJsonPath('data.rango.agrupar', 'mes')
            ->assertJsonCount(12, 'data.serie')
            ->assertJsonPath('data.serie.0.etiqueta', 'ene 2026')
            ->assertJsonPath('data.serie.0.ventas', '100.00')
            ->assertJsonPath('data.serie.1.ventas', '50.00')
            ->assertJsonPath('data.serie.2.ventas', '70.00')
            ->assertJsonPath('data.por_anio.0.anio', 2026)
            ->assertJsonPath('data.por_anio.0.ventas', '220.00')
            ->assertJsonPath('data.top_platos.0.nombre', 'Chicha morada')
            ->assertJsonPath('data.top_platos.0.cantidad', '3')
            ->assertJsonPath('data.top_platos.0.ventas', '170.00')
            ->assertJsonPath('data.por_metodo.0.codigo', 'EFECTIVO')
            ->assertJsonPath('data.por_metodo.0.ventas', '220.00')
            ->assertJsonPath('data.por_sucursal.0.sucursal_id', $this->branch)
            ->assertJsonPath('data.por_sucursal.0.ventas', '150.00')
            ->assertJsonPath('data.anios.0', 2026)
            ->assertJsonPath('data.anios.1', 2025);

        $hours = collect($response->json('data.por_hora'))->pluck('ventas', 'hora');
        $this->assertSame('100.00', $hours['13:00']);
        $this->assertSame('50.00', $hours['20:00']);
        $this->assertSame('70.00', $hours['12:00']);
    }

    public function test_branch_filter_and_previous_period_comparison(): void
    {
        $this->sale('2026-01-15 13:00:00', $this->session, [
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1, 'total' => 100],
        ]);
        $this->sale('2026-02-10 20:00:00', $this->session, [
            ['producto_id' => $this->ids['pan'], 'cantidad' => 1, 'total' => 50],
        ]);
        $this->sale('2026-02-12 19:00:00', $this->secondSession, [
            ['producto_id' => $this->ids['chicha'], 'cantidad' => 1, 'total' => 70],
        ]);

        $this->as($this->admin, 'GET', "analiticas?desde=2026-02-01&hasta=2026-02-28&sucursal_id={$this->branch}")
            ->assertOk()
            ->assertJsonPath('data.kpis.ventas', '50.00')
            ->assertJsonPath('data.kpis.ordenes', 1)
            ->assertJsonCount(1, 'data.por_sucursal');

        // Febrero (50) contra el rango anterior equivalente (100 de enero): cae a la mitad.
        $this->as($this->admin, 'GET', "analiticas?desde=2026-02-01&hasta=2026-02-28&sucursal_id={$this->branch}")
            ->assertJsonPath('data.comparacion.ventas_pct', -50)
            ->assertJsonPath('data.comparacion.ordenes_pct', 0);
    }

    public function test_analytics_require_the_reports_permission(): void
    {
        $this->as($this->waiter, 'GET', 'analiticas')->assertForbidden();
        $this->as($this->user('Cocinero', 'cocina@donjose.pe'), 'GET', 'analiticas')->assertForbidden();

        $this->as($this->admin, 'GET', 'analiticas')->assertOk()->assertJsonCount(2, 'data.sucursales');
    }

    /** @param list<array{producto_id: int, cantidad: int, total: int}> $lines */
    private function sale(string $lima, int $sessionId, array $lines): void
    {
        $at = CarbonImmutable::parse($lima, 'America/Lima')->utc();
        $totalCents = array_sum(array_column($lines, 'total')) * 100;
        $base = intdiv($totalCents * 100, 118);
        $igv = $totalCents - $base;
        $branch = $sessionId === $this->secondSession ? $this->secondBranch : $this->branch;

        $this->asTenant(function () use ($lines, $at, $totalCents, $base, $igv, $sessionId, $branch) {
            $saleId = DB::table('ventas')->insertGetId([
                'inquilino_id' => $this->tenant->id,
                'sucursal_id' => $branch,
                'sesion_caja_id' => $sessionId,
                'usuario_id' => $this->cashierId,
                'op_gravada' => $base / 100,
                'op_exonerada' => 0,
                'op_inafecta' => 0,
                'igv' => $igv / 100,
                'total' => $totalCents / 100,
                'monto_propina' => 0,
                'estado' => 'EMITIDA',
                'creado_en' => $at,
                'actualizado_en' => $at,
            ]);

            foreach ($lines as $line) {
                $lineCents = $line['total'] * 100;
                $lineBase = intdiv($lineCents * 100, 118);

                DB::table('detalle_ventas')->insert([
                    'inquilino_id' => $this->tenant->id,
                    'venta_id' => $saleId,
                    'producto_id' => $line['producto_id'],
                    'descripcion' => 'Plato',
                    'tipo_afectacion_igv_id' => $this->affectation,
                    'cantidad' => $line['cantidad'],
                    'precio_unitario' => $lineCents / 100 / max(1, $line['cantidad']),
                    'descuento' => 0,
                    'igv' => ($lineCents - $lineBase) / 100,
                    'total' => $lineCents / 100,
                ]);
            }

            DB::table('pagos')->insert([
                'inquilino_id' => $this->tenant->id,
                'venta_id' => $saleId,
                'sesion_caja_id' => $sessionId,
                'metodo_pago_id' => $this->methods['EFECTIVO'],
                'monto' => $totalCents / 100,
                'monto_recibido' => null,
                'vuelto' => 0,
                'referencia' => null,
                'creado_en' => $at,
                'actualizado_en' => $at,
            ]);
        });
    }

    private function cashSession(int $branchId, int $openerId): int
    {
        return $this->asTenant(function () use ($branchId, $openerId) {
            $register = DB::table('cajas')->insertGetId([
                'inquilino_id' => $this->tenant->id,
                'sucursal_id' => $branchId,
                'nombre' => 'Caja '.$branchId,
                'es_activa' => true,
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]);

            return DB::table('sesiones_caja')->insertGetId([
                'inquilino_id' => $this->tenant->id,
                'caja_id' => $register,
                'abierta_por' => $openerId,
                'abierta_en' => now(),
                'monto_apertura' => 0,
                'estado' => 'ABIERTA',
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]);
        });
    }
}
