<?php

namespace Tests\Feature\Restaurant;

use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 011: empresa y sucursales (specs/011-empresa-sucursales/backend.md).
 */
class ConfigurationTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
    }

    public function test_admin_reads_and_edits_the_company_and_others_cannot(): void
    {
        $this->as($this->admin, 'GET', 'empresa')->assertOk()
            ->assertJsonStructure(['data' => ['id', 'ruc', 'razon_social', 'nombre_comercial', 'direccion_fiscal', 'ubigeo', 'homologado']]);

        $ubigeo = (int) DB::table('ubigeos')->where('codigo', '150122')->value('id');
        $this->as($this->admin, 'PATCH', 'empresa', [
            'razon_social' => 'Don José Restaurante SAC',
            'nombre_comercial' => 'Don José',
            'direccion_fiscal' => 'Av. Larco 123, Miraflores',
            'ubigeo_id' => $ubigeo,
        ])->assertOk()
            ->assertJsonPath('data.razon_social', 'Don José Restaurante SAC')
            ->assertJsonPath('data.ubigeo.distrito', 'MIRAFLORES');

        $this->as($this->waiter, 'GET', 'empresa')->assertForbidden();
        $this->as($this->waiter, 'PATCH', 'empresa', ['nombre_comercial' => 'Hackeado'])->assertForbidden();
        $this->as($this->admin, 'GET', 'empresa')->assertJsonPath('data.nombre_comercial', 'Don José');
    }

    public function test_ruc_is_validated_and_locked_once_real_receipts_exist(): void
    {
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20100070971'])
            ->assertStatus(422)->assertJsonValidationErrorFor('ruc', 'error.detalles');
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '123'])
            ->assertStatus(422)->assertJsonValidationErrorFor('ruc', 'error.detalles');

        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20100070970'])->assertOk()->assertJsonPath('data.ruc', '20100070970');

        // Un comprobante simulado no bloquea; uno real sí.
        $this->chargeOneOrder();
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20131312955'])->assertOk();

        $this->asTenant(fn () => DB::table('comprobantes')->update(['es_simulado' => false]));
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20100070970'])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'RUC_CON_COMPROBANTES');
        // Corregir otros datos sigue permitido.
        $this->as($this->admin, 'PATCH', 'empresa', ['nombre_comercial' => 'Don José Centro'])->assertOk();
    }

    public function test_branches_are_created_with_the_next_code_and_the_plan_limit_applies(): void
    {
        $this->as($this->admin, 'GET', 'sucursales')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.es_principal', true)
            ->assertJsonPath('meta.activas', 1)
            ->assertJsonPath('meta.max_sucursales', 3);

        $ubigeo = (int) DB::table('ubigeos')->where('codigo', '150101')->value('id');
        $second = $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local San Isidro', 'direccion' => 'Javier Prado 500', 'ubigeo_id' => $ubigeo])
            ->assertCreated()
            ->assertJsonPath('data.es_principal', false)
            ->assertJsonPath('data.es_activa', true)
            ->assertJsonPath('data.ubigeo.distrito', 'LIMA');
        $this->assertSame('0001', $second->json('data.codigo_establecimiento'));

        $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local Barranco', 'codigo_establecimiento' => '0001'])
            ->assertStatus(422)->assertJsonValidationErrorFor('codigo_establecimiento', 'error.detalles');
        $this->as($this->admin, 'POST', 'sucursales', ['nombre' => ''])->assertStatus(422);

        // El plan RESTAURANTE permite 3 sucursales activas.
        $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local Barranco'])->assertCreated();
        $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local extra'])
            ->assertStatus(429)->assertJsonPath('error.codigo', 'LIMITE_PLAN_ALCANZADO');

        $this->assertSame(3, (int) $this->asTenant(fn () => DB::table('uso_inquilino')->where('periodo', today()->format('Y-m'))->value('sucursales_activas')));
    }

    public function test_exactly_one_branch_is_principal(): void
    {
        $second = $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local San Isidro'])->json('data.id');

        $this->as($this->admin, 'PATCH', "sucursales/{$second}", ['es_principal' => true])->assertOk()->assertJsonPath('data.es_principal', true);

        $list = $this->as($this->admin, 'GET', 'sucursales')->json('data');
        $this->assertCount(1, array_filter($list, fn (array $branch) => $branch['es_principal']));
        $this->assertSame($second, $list[0]['id']);

        // No se "quita" la principal: se elige otra.
        $this->as($this->admin, 'PATCH', "sucursales/{$second}", ['es_principal' => false])->assertStatus(422);
    }

    public function test_deactivating_follows_the_rules_and_hides_the_branch_from_the_team(): void
    {
        $first = $this->ids['sucursal'];
        $second = $this->as($this->admin, 'POST', 'sucursales', ['nombre' => 'Local San Isidro'])->json('data.id');

        // La principal no se desactiva.
        $this->as($this->admin, 'PATCH', "sucursales/{$first}", ['es_activa' => false])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'SUCURSAL_PRINCIPAL');

        // Con un pedido abierto, tampoco aunque ya no sea la principal.
        $order = $this->open($this->ids['m1'])->json('data.id');
        $this->as($this->admin, 'PATCH', "sucursales/{$second}", ['es_principal' => true])->assertOk();
        $this->as($this->admin, 'PATCH', "sucursales/{$first}", ['es_activa' => false])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'SUCURSAL_CON_ACTIVIDAD');

        // Con un turno de caja abierto, tampoco.
        $this->as($this->waiter, 'POST', "pedidos/{$order}/anular")->assertOk();
        $cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->as($cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0, 'sucursal_id' => $first])->assertCreated();
        $this->as($this->admin, 'PATCH', "sucursales/{$first}", ['es_activa' => false])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'SUCURSAL_CON_ACTIVIDAD');

        // Cerrada la caja y sin pedidos, se desactiva y el equipo deja de verla.
        $session = $this->as($cashier, 'GET', 'sesiones-caja/actual')->json('data.id');
        $this->as($cashier, 'POST', "sesiones-caja/{$session}/cierre", ['monto_cierre_declarado' => 0])->assertOk();
        $this->as($this->admin, 'PATCH', "sucursales/{$first}", ['es_activa' => false])->assertOk()->assertJsonPath('data.es_activa', false);

        $ids = array_column($this->as($this->admin, 'GET', 'auth/yo')->json('data.sucursales'), 'id');
        $this->assertSame([$second], $ids);

        // Reactivar cuenta contra el límite del plan y la devuelve al equipo.
        $this->as($this->admin, 'PATCH', "sucursales/{$first}", ['es_activa' => true])->assertOk()->assertJsonPath('data.es_activa', true);
    }

    public function test_ubigeo_search_ignores_accents_and_case(): void
    {
        $this->as($this->waiter, 'GET', 'ubigeos?q=mira')->assertOk()->assertJsonPath('data.0.distrito', 'MIRAFLORES');
        $this->as($this->waiter, 'GET', 'ubigeos?q=150104')->assertOk()->assertJsonPath('data.0.distrito', 'BARRANCO');
        $this->as($this->waiter, 'GET', 'ubigeos?q=m')->assertStatus(422);
    }

    public function test_branches_of_another_restaurant_do_not_exist(): void
    {
        $other = $this->provision('otro');
        $otherToken = $this->tokenFor($other, 'admin@otro.pe');

        $this->forget();
        $this->withToken($otherToken)->patchJson($this->tenantUrl('otro', "sucursales/{$this->ids['sucursal']}"), ['nombre' => 'Robada'])->assertNotFound();
        $this->assertSame('Local principal', $this->as($this->admin, 'GET', 'sucursales')->json('data.0.nombre'));
    }

    public function test_dashboard_steps_link_to_their_screens(): void
    {
        $steps = collect($this->as($this->admin, 'GET', 'panel/resumen')->assertOk()->json('data.configuracion'))->keyBy('clave');

        $this->assertSame('/panel/configuracion', $steps['datos_fiscales']['ruta']);
        $this->assertSame('/panel/plano', $steps['plano']['ruta']);
        $this->assertNull($steps['certificado']['ruta']);
        $this->assertNull($steps['sunat']['ruta']);
    }

    /** Un pedido cobrado en la sucursal principal, para tener un comprobante. */
    private function chargeOneOrder(): TestResponse
    {
        $cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->as($cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();

        $order = $this->open($this->ids['m1'])->json('data.id');
        $this->send($order, [['producto_id' => $this->ids['pan'], 'cantidad' => 1]])->assertCreated();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();

        $cash = (int) DB::table('metodos_pago')->where('codigo', 'EFECTIVO')->value('id');

        return $this->as($cashier, 'POST', "pedidos/{$order}/cobro", ['pagos' => [['metodo_pago_id' => $cash, 'monto' => 6]]], idempotent: true)->assertCreated();
    }
}
