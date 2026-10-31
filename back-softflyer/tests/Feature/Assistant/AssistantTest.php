<?php

namespace Tests\Feature\Assistant;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use App\Core\Iam\Infrastructure\Persistence\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 040: asistente IA sobre datos reales del restaurante. */
class AssistantTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cashier;

    /** @var array<string, int> */
    private array $methods = [];

    protected function setUp(): void
    {
        parent::setUp();
        // Congelar antes de los tokens: Sanctum expira y viajar en el tiempo los invalidaría.
        $this->freezeAt('2026-11-03 12:00:00');
        $this->buildRestaurant();
        $this->cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->methods = DB::table('metodos_pago')->pluck('id', 'codigo')->all();
        $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();

        config([
            'services.gemini.key' => 'test-key',
            'services.gemini.model' => 'gemini-3.5-flash-lite',
            'services.gemini.endpoint' => 'https://generativelanguage.googleapis.com/v1beta',
        ]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_requires_authentication_and_reports_permission(): void
    {
        // Sin sesión, el middleware de permisos corta antes con 403 (no se filtra nada).
        $this->postJson($this->tenantUrl('donjose', 'asistente/chat'), ['mensaje' => '¿Cuánto vendí hoy?'])
            ->assertStatus(403);

        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy']);
        $this->as($this->waiter, 'POST', 'asistente/chat', ['mensaje' => '¿Cuánto vendí hoy?'])->assertForbidden();
        $this->as($this->user('Cocinero', 'cocina@donjose.pe'), 'POST', 'asistente/chat', ['mensaje' => 'stock'])->assertForbidden();
    }

    public function test_sales_answer_uses_real_data_and_the_consulted_period(): void
    {
        $this->sell($this->ids['pan'], 2, '12.00');
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy']);

        $response = $this->ask('¿Cuánto vendí hoy?')->assertOk();

        $response->assertJsonPath('data.accion', 'consultar_ventas')
            ->assertJsonPath('data.periodo.desde', '2026-11-03')
            ->assertJsonPath('data.periodo.hasta', '2026-11-03')
            ->assertJsonPath('data.visualizacion.tipo', 'metric')
            ->assertJsonPath('data.visualizacion.valor', '12.00');

        $this->assertStringContainsString('12.00', $response->json('data.respuesta'));
        $this->assertStringContainsString('1 cuentas', $response->json('data.respuesta'));
    }

    public function test_comparison_uses_the_previous_period(): void
    {
        // Semana actual (2–8 nov): 12.00 · Semana anterior (26 oct – 1 nov): 6.00
        $this->sell($this->ids['pan'], 2, '12.00');

        $this->freezeAt('2026-10-27 12:00:00');
        $this->sell($this->ids['pan'], 1, '6.00');
        $this->freezeAt('2026-11-03 12:00:00');

        $this->fakeAction('comparar_ventas', ['periodo' => 'semana', 'comparar_con' => 'anterior']);

        $response = $this->ask('Compara esta semana con la anterior')->assertOk();

        $response->assertJsonPath('data.accion', 'comparar_ventas')
            ->assertJsonPath('data.visualizacion.actual.valor', '12.00')
            ->assertJsonPath('data.visualizacion.anterior.valor', '6.00')
            ->assertJsonPath('data.visualizacion.variacion_pct', 100);

        $this->assertStringContainsString('100%', $response->json('data.respuesta'));
    }

    public function test_top_dishes_respects_metric_and_limit(): void
    {
        $this->sell($this->ids['chicha'], 5, '50.00');
        $this->sell($this->ids['pan'], 3, '18.00');

        $this->fakeAction('productos_mas_vendidos', ['periodo' => 'hoy', 'limite' => 1, 'metrica' => 'unidades']);

        $response = $this->ask('¿Cuáles fueron mis productos más vendidos hoy?')->assertOk();

        $response->assertJsonPath('data.accion', 'productos_mas_vendidos')
            ->assertJsonPath('data.visualizacion.tipo', 'lista')
            ->assertJsonCount(1, 'data.visualizacion.items')
            ->assertJsonPath('data.visualizacion.items.0.titulo', '1. Chicha morada');

        $this->assertStringContainsString('Chicha morada', $response->json('data.respuesta'));
    }

    public function test_low_stock_lists_only_items_at_or_below_the_minimum(): void
    {
        $this->stockItem('Papa amarilla', 5, 2);
        $this->stockItem('Cebolla roja', 1, 10);

        $this->fakeAction('consultar_stock_bajo', ['limite' => 10]);

        $response = $this->ask('¿Qué productos tienen poco stock?')->assertOk();

        $response->assertJsonPath('data.accion', 'consultar_stock_bajo')
            ->assertJsonPath('data.visualizacion.tipo', 'lista')
            ->assertJsonCount(1, 'data.visualizacion.items')
            ->assertJsonPath('data.visualizacion.items.0.titulo', 'Papa amarilla');

        $this->assertStringContainsString('Papa amarilla', $response->json('data.respuesta'));
        $this->assertStringNotContainsString('Cebolla roja', $response->json('data.respuesta'));
    }

    public function test_an_unknown_action_is_rejected(): void
    {
        $this->fakeAction('borrar_todo');

        $this->ask()->assertStatus(422)->assertJsonPath('error.codigo', 'ASISTENTE_ACCION_INVALIDA');
    }

    public function test_invalid_period_arguments_are_rejected(): void
    {
        $this->fakeAction('consultar_ventas', ['periodo' => 'semestre']);

        $this->ask()->assertStatus(422)->assertJsonPath('error.codigo', 'ASISTENTE_ARGUMENTOS_INVALIDOS');
    }

    public function test_unexpected_arguments_are_rejected(): void
    {
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy', 'sql' => 'DROP TABLE ventas']);

        $this->ask()->assertStatus(422)->assertJsonPath('error.codigo', 'ASISTENTE_ARGUMENTOS_INVALIDOS');
    }

    public function test_a_branch_outside_the_users_scope_is_rejected(): void
    {
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy', 'sucursal_id' => 999999]);

        $this->ask()->assertStatus(422)->assertJsonPath('error.codigo', 'ASISTENTE_SUCURSAL_INVALIDA');
    }

    public function test_other_tenants_never_see_this_tenants_numbers(): void
    {
        $this->sell($this->ids['pan'], 2, '12.00');
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy']);

        $other = $this->provision('otro');
        $this->forget();
        $response = $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->postJson($this->tenantUrl('otro', 'asistente/chat'), ['mensaje' => '¿Cuánto vendí hoy?'])
            ->assertOk();

        $this->assertStringContainsString('No hay ventas', $response->json('data.respuesta'));
        $this->assertStringNotContainsString('12.00', $response->json('data.respuesta'));
    }

    public function test_a_text_answer_from_the_model_becomes_a_safe_help_message(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['steps' => [], 'output_text' => 'Cifra inventada: 9999'], 200)]);

        $response = $this->ask('¿Cómo va el negocio?')->assertOk();

        $response->assertJsonPath('data.accion', null)
            ->assertJsonPath('data.periodo', null)
            ->assertJsonCount(6, 'data.sugerencias');

        $this->assertStringNotContainsString('9999', $response->json('data.respuesta'));
    }

    public function test_social_messages_are_answered_locally_without_calling_gemini(): void
    {
        $greeting = $this->ask('Hola')->assertOk()->assertJsonPath('data.accion', 'conversacion');
        $this->assertMatchesRegularExpression('/\p{Extended_Pictographic}/u', $greeting->json('data.respuesta'));

        $this->ask('chau')->assertOk()->assertJsonPath('data.accion', 'conversacion');
        $this->ask('gracias')->assertOk()->assertJsonPath('data.accion', 'conversacion');
        $this->ask('¿Qué puedes hacer?')->assertOk()->assertJsonPath('data.accion', 'conversacion');

        Http::assertNothingSent();
    }

    public function test_off_topic_questions_are_rejected_without_calling_gemini(): void
    {
        $response = $this->ask('¿Quién ganó el partido?')->assertOk();

        $response->assertJsonPath('data.accion', 'fuera_de_tema')
            ->assertJsonPath('data.periodo', null)
            ->assertJsonPath('data.visualizacion', null);

        $this->assertStringContainsString('restaurante', $response->json('data.respuesta'));
        Http::assertNothingSent();
    }

    public function test_provider_failures_are_reported_without_internal_details(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'SECRETO-PROVEEDOR']], 500)]);

        $this->ask()->assertStatus(502)->assertJsonPath('error.codigo', 'ASISTENTE_NO_DISPONIBLE');
        $this->assertStringNotContainsString('SECRETO-PROVEEDOR', $this->ask()->getContent());

        config(['services.gemini.key' => null]);
        $this->ask()->assertStatus(503)->assertJsonPath('error.codigo', 'ASISTENTE_NO_CONFIGURADO');
    }

    public function test_depleted_credits_are_reported_clearly(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'prepayment credits depleted']], 402)]);

        $this->ask()->assertStatus(503)->assertJsonPath('error.codigo', 'ASISTENTE_SIN_CREDITO');
    }

    public function test_provider_timeout_is_reported_as_unavailable(): void
    {
        Http::fake(fn () => throw new ConnectionException('timeout interno'));

        $this->ask()->assertStatus(502)->assertJsonPath('error.codigo', 'ASISTENTE_NO_DISPONIBLE');
    }

    public function test_message_length_is_limited_and_never_hits_the_provider(): void
    {
        $this->ask(str_repeat('x', 501))->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_rate_limit_blocks_abuse(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['steps' => []], 200)]);

        for ($i = 0; $i < 15; $i++) {
            $this->ask('Hola')->assertOk();
        }

        $this->ask('Hola')->assertStatus(429);
    }

    public function test_the_api_key_is_not_echoed_and_business_data_is_not_sent_to_gemini(): void
    {
        $this->sell($this->ids['chicha'], 2, '20.00');
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy']);

        $response = $this->ask('¿Cuánto vendí hoy?')->assertOk();

        $this->assertStringNotContainsString('test-key', $response->getContent());
        Http::assertSent(function (Request $request) {
            $payload = json_encode($request->data());

            return (str_contains($request->url(), 'gemini-3.5-flash-lite') || str_contains($payload, 'gemini-3.5-flash-lite'))
                && str_contains($request->url(), '/interactions')
                && ! str_contains($payload, '20.00')
                && ! str_contains($payload, 'Chicha morada');
        });
    }

    public function test_the_classic_generate_content_response_is_also_understood(): void
    {
        config(['services.gemini.api' => 'generate_content']);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [['functionCall' => ['name' => 'consultar_ventas', 'args' => ['periodo' => 'hoy']]]]],
                ]],
            ], 200),
        ]);

        $response = $this->ask('¿Cuánto vendí hoy?')->assertOk();

        $response->assertJsonPath('data.accion', 'consultar_ventas');
        Http::assertSent(fn (Request $request) => str_contains($request->url(), ':generateContent'));
    }

    public function test_it_understands_yesterday(): void
    {
        $this->freezeAt('2026-11-02 12:00:00');
        $this->sell($this->ids['pan'], 2, '12.00');
        $this->freezeAt('2026-11-03 12:00:00');

        $this->fakeAction('consultar_ventas', ['periodo' => 'ayer']);

        $response = $this->ask('¿Cuánto vendí ayer?')->assertOk();

        $response->assertJsonPath('data.accion', 'consultar_ventas')
            ->assertJsonPath('data.periodo.desde', '2026-11-02')
            ->assertJsonPath('data.periodo.hasta', '2026-11-02')
            ->assertJsonPath('data.visualizacion.tipo', 'metric')
            ->assertJsonPath('data.visualizacion.valor', '12.00');

        $this->assertStringContainsString('12.00', $response->json('data.respuesta'));
    }

    public function test_it_finds_the_peak_hours(): void
    {
        $this->freezeAt('2026-11-03 13:00:00');
        $this->sell($this->ids['pan'], 2, '12.00');
        $this->freezeAt('2026-11-03 18:00:00');
        $this->sell($this->ids['pan'], 3, '18.00');
        $this->freezeAt('2026-11-03 12:00:00');

        $this->fakeAction('ventas_por_hora', ['periodo' => 'hoy']);

        $response = $this->ask('¿Cuáles son mis horas punta?')->assertOk();

        $response->assertJsonPath('data.accion', 'ventas_por_hora')
            ->assertJsonPath('data.visualizacion.tipo', 'barras');

        $hours = collect($response->json('data.visualizacion.puntos'))->pluck('etiqueta')->all();
        $this->assertContains('13:00', $hours);
        $this->assertContains('18:00', $hours);
        $this->assertStringContainsString('18:00', $response->json('data.respuesta'));
    }

    public function test_recommendations_combine_sales_peak_hours_and_stock(): void
    {
        $this->freezeAt('2026-11-03 13:00:00');
        $this->sell($this->ids['pan'], 2, '12.00');

        $this->freezeAt('2026-10-27 13:00:00');
        $this->sell($this->ids['pan'], 1, '6.00');

        $this->freezeAt('2026-11-03 12:00:00');
        $this->stockItem('Papa amarilla', 5, 2);

        $this->fakeAction('recomendaciones', ['periodo' => 'semana']);

        $response = $this->ask('¿Qué me recomiendas?')->assertOk();

        $response->assertJsonPath('data.accion', 'recomendaciones')
            ->assertJsonPath('data.visualizacion.tipo', 'lista');

        $answer = $response->json('data.respuesta');
        $this->assertStringContainsString('Aprovecha el impulso', $answer);
        $this->assertStringContainsString('Pan al ajo', $answer);
        $this->assertStringContainsString('13:00', $answer);
        $this->assertStringContainsString('Papa amarilla', $answer);
        $this->assertGreaterThanOrEqual(4, count($response->json('data.visualizacion.items')));
    }

    public function test_waiter_performance_ranks_sales_by_waiter(): void
    {
        $lucia = $this->waiterNamed('Lucía', 'lucia@donjose.pe');
        $this->sell($this->ids['pan'], 4, '24.00', $lucia);
        $this->sell($this->ids['pan'], 2, '12.00');

        $this->fakeAction('rendimiento_meseros', ['periodo' => 'hoy']);

        $response = $this->ask('¿Cómo van mis meseros?')->assertOk();

        $response->assertJsonPath('data.accion', 'rendimiento_meseros')
            ->assertJsonPath('data.visualizacion.tipo', 'lista')
            ->assertJsonCount(2, 'data.visualizacion.items')
            ->assertJsonPath('data.visualizacion.items.0.titulo', '1. Lucía')
            ->assertJsonPath('data.visualizacion.items.1.titulo', '2. Mozo');

        $this->assertStringContainsString('24.00', $response->json('data.respuesta'));
    }

    public function test_inventory_summary_separates_low_and_healthy_items(): void
    {
        $this->stockItem('Papa amarilla', 5, 2);
        $this->stockItem('Cebolla roja', 1, 10);

        $this->fakeAction('resumen_stock');

        $response = $this->ask('¿Cómo está mi inventario?')->assertOk();

        $response->assertJsonPath('data.accion', 'resumen_stock')
            ->assertJsonPath('data.visualizacion.tipo', 'lista')
            ->assertJsonPath('data.visualizacion.items.0.titulo', 'Bajo mínimo')
            ->assertJsonPath('data.visualizacion.items.0.detalle', '1 artículos')
            ->assertJsonPath('data.visualizacion.items.1.titulo', 'Sobre el mínimo')
            ->assertJsonPath('data.visualizacion.items.1.detalle', '1 artículos');

        $answer = $response->json('data.respuesta');
        $this->assertStringContainsString('2 artículos', $answer);
        $this->assertStringContainsString('1 bajo mínimo', $answer);
        $this->assertStringContainsString('Papa amarilla', $answer);
    }

    public function test_it_never_logs_the_question(): void
    {
        Log::spy();
        $this->fakeAction('consultar_ventas', ['periodo' => 'hoy']);

        $this->ask('Mi pregunta privada sobre ventas');

        Log::shouldNotHaveReceived('info', function (string $message, array $context = []) {
            return str_contains($message, 'Mi pregunta privada') || str_contains(json_encode($context), 'Mi pregunta privada');
        });
    }

    /** @param array<string, mixed> $arguments */
    private function fakeAction(string $name, array $arguments = []): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'steps' => [['type' => 'function_call', 'name' => $name, 'arguments' => (object) $arguments]],
            ], 200),
        ]);
    }

    private function ask(string $message = '¿Cuánto vendí hoy?'): TestResponse
    {
        return $this->as($this->admin, 'POST', 'asistente/chat', ['mensaje' => $message]);
    }

    private function sell(int $productId, int $quantity, string $total, ?string $waiter = null): void
    {
        $waiter ??= $this->waiter;
        $order = $this->as($waiter, 'POST', 'pedidos', [
            'tipo' => 'SALON',
            'mesa_id' => $this->ids['m1'],
        ], idempotent: true)->assertCreated()->json('data.id');

        $this->as($waiter, 'POST', "pedidos/{$order}/comandas", [
            'items' => [['producto_id' => $productId, 'cantidad' => $quantity]],
        ], idempotent: true)->assertCreated();

        $this->as($waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();
        $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", [
            'pagos' => [['metodo_pago_id' => $this->methods['EFECTIVO'], 'monto' => $total]],
        ], idempotent: true)->assertCreated();
    }

    private function waiterNamed(string $name, string $email): string
    {
        return $this->asTenant(function () use ($name, $email) {
            $user = User::create(['nombre' => $name, 'correo' => $email, 'contrasena' => 'contrasena-segura']);
            DB::table('rol_usuario')->insert([
                'inquilino_id' => $this->tenant->id,
                'usuario_id' => $user->id,
                'rol_id' => DB::table('roles')->where('nombre', 'Mozo')->value('id'),
            ]);

            return $user->createToken('web')->plainTextToken;
        });
    }

    private function stockItem(string $name, float $minimum, float $quantity): void
    {
        $warehouses = collect($this->as($this->admin, 'GET', "inventario/catalogos?sucursal_id={$this->ids['sucursal']}")->json('data.almacenes'));
        $kitchen = (int) $warehouses->firstWhere('estacion_id', $this->ids['cocina'])['id'];
        $unit = $this->asTenant(fn () => (int) DB::table('unidades_medida')->where('codigo', 'KGM')->value('id'));

        $product = $this->as($this->admin, 'POST', 'inventario/articulos', [
            'almacen_id' => $kitchen,
            'nombre' => $name,
            'unidad_medida_id' => $unit,
            'categoria_inventario' => 'ALIMENTO',
            'naturaleza_inventario' => 'CONSUMIBLE',
            'stock_minimo' => $minimum,
        ])->assertCreated()->json('data.producto.id');

        $this->as($this->admin, 'POST', 'inventario/movimientos', [
            'almacen_id' => $kitchen,
            'producto_id' => $product,
            'tipo' => 'ENTRADA',
            'cantidad' => $quantity,
            'motivo' => 'Compra de prueba',
        ], true)->assertCreated();
    }

    private function freezeAt(string $lima): void
    {
        $moment = CarbonImmutable::parse($lima, 'America/Lima')->utc();
        Carbon::setTestNow($moment);
        CarbonImmutable::setTestNow($moment);
    }
}
