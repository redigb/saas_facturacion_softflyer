<?php

namespace Tests\Feature\Iam;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 032: horarios, geocerca y hora del servidor. */
class AttendanceTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private int $waiterId;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-19 13:50:00 UTC');
        $this->buildRestaurant();
        $this->waiterId = $this->asTenant(fn () => (int) DB::table('usuarios')->where('correo', 'mozo@donjose.pe')->value('id'));

        $this->as($this->admin, 'PATCH', "sucursales/{$this->ids['sucursal']}", [
            'latitud' => -12.1211000,
            'longitud' => -77.0305000,
            'radio_geocerca_metros' => 80,
        ])->assertOk()->assertJsonPath('data.geocerca.radio_metros', 80);

        $this->as($this->admin, 'PUT', "asistencia/horarios/{$this->waiterId}", [
            'sucursal_id' => $this->ids['sucursal'],
            'dias_semana' => [1, 2, 3, 4, 5, 6],
            'hora_entrada' => '09:00',
            'hora_salida' => '18:00',
            'tolerancia_minutos' => 5,
        ])->assertOk()->assertJsonPath('data.hora_entrada', '09:00');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_waiter_marks_entry_and_exit_with_server_time_inside_geofence(): void
    {
        CarbonImmutable::setTestNow('2026-10-19 14:03:00 UTC'); // 09:03 en Lima, lunes.

        $this->as($this->waiter, 'GET', "asistencia/mi-jornada?sucursal_id={$this->ids['sucursal']}")
            ->assertOk()
            ->assertJsonPath('data.proxima_marcacion', 'ENTRADA')
            ->assertJsonPath('data.horario.hora_entrada', '09:00')
            ->assertJsonPath('data.servidor_ahora', '2026-10-19T14:03:00Z');

        $entry = $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211200,
            'longitud' => -77.0305100,
            'precision_metros' => 12.5,
        ], key: '00000000-0000-4000-8000-000000000001');

        $entry->assertCreated()
            ->assertJsonPath('data.marcacion.tipo', 'ENTRADA')
            ->assertJsonPath('data.marcacion.estado', 'PUNTUAL')
            ->assertJsonPath('data.marcacion.marcado_en', '2026-10-19T14:03:00Z')
            ->assertJsonPath('data.jornada.proxima_marcacion', 'SALIDA');

        CarbonImmutable::setTestNow('2026-10-19 20:40:00 UTC');
        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211200,
            'longitud' => -77.0305100,
            'precision_metros' => 9,
        ], key: '00000000-0000-4000-8000-000000000002')->assertCreated()
            ->assertJsonPath('data.marcacion.tipo', 'SALIDA')
            ->assertJsonPath('data.marcacion.estado', 'REGISTRADA')
            ->assertJsonCount(2, 'data.jornada.marcaciones');
    }

    public function test_late_entry_is_decided_by_server_clock(): void
    {
        CarbonImmutable::setTestNow('2026-10-19 14:08:00 UTC');

        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211000,
            'longitud' => -77.0305000,
            'precision_metros' => 8,
            'marcado_en' => '2026-10-19T13:50:00Z', // Se ignora: no forma parte del contrato validado.
        ], key: '00000000-0000-4000-8000-000000000003')->assertCreated()
            ->assertJsonPath('data.marcacion.estado', 'TARDANZA')
            ->assertJsonPath('data.marcacion.marcado_en', '2026-10-19T14:08:00Z');
    }

    public function test_rejects_inaccurate_or_outside_positions_and_missing_schedule(): void
    {
        CarbonImmutable::setTestNow('2026-10-19 14:00:00 UTC');

        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211000,
            'longitud' => -77.0305000,
            'precision_metros' => 140,
        ], key: '00000000-0000-4000-8000-000000000004')->assertStatus(422)->assertJsonPath('error.codigo', 'UBICACION_IMPRECISA');

        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1300000,
            'longitud' => -77.0400000,
            'precision_metros' => 10,
        ], key: '00000000-0000-4000-8000-000000000005')->assertStatus(422)->assertJsonPath('error.codigo', 'FUERA_DE_GEOCERCA');

        CarbonImmutable::setTestNow('2026-10-18 14:00:00 UTC'); // Domingo no asignado.
        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211000,
            'longitud' => -77.0305000,
            'precision_metros' => 10,
        ], key: '00000000-0000-4000-8000-000000000006')->assertStatus(422)->assertJsonPath('error.codigo', 'SIN_HORARIO_HOY');

        $this->assertSame(0, $this->asTenant(fn () => DB::table('marcaciones_asistencia')->count()));
    }

    public function test_admin_reviews_daily_summary_and_other_tenant_cannot_read_it(): void
    {
        CarbonImmutable::setTestNow('2026-10-19 14:02:00 UTC');
        $this->as($this->waiter, 'POST', 'asistencia/marcaciones', [
            'sucursal_id' => $this->ids['sucursal'],
            'latitud' => -12.1211000,
            'longitud' => -77.0305000,
            'precision_metros' => 6,
        ], key: '00000000-0000-4000-8000-000000000007')->assertCreated();

        $this->as($this->admin, 'GET', "asistencia/resumen?sucursal_id={$this->ids['sucursal']}&fecha=2026-10-19")
            ->assertOk()
            ->assertJsonPath('data.personas.0.usuario.nombre', 'Mozo')
            ->assertJsonPath('data.personas.0.estado', 'PUNTUAL');

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->getJson($this->tenantUrl('otro', "asistencia/resumen?sucursal_id={$this->ids['sucursal']}&fecha=2026-10-19"))
            ->assertNotFound();
    }
}
