<?php

namespace Tests\Feature\Tenancy;

use App\Core\Tenancy\Infrastructure\Persistence\IdempotencyKey;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Core\Tenancy\Presentation\Middleware\EnsureIdempotency;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\DatabaseTestCase;

/**
 * Spec 001: un reintento con la misma Idempotency-Key no vuelve a ejecutar la operacion (Doc. 07 §5).
 */
class IdempotencyTest extends DatabaseTestCase
{
    private int $executions = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTenant('demo');
        $this->createTenant('donjose');

        Route::middleware(['inquilino', 'idempotente'])->prefix('api/v1/_prueba')->group(function (): void {
            Route::post('/comandas', function () {
                $this->executions++;

                return response()->json(['data' => ['numero' => $this->executions]], 201);
            });

            Route::post('/falla', function () {
                $this->executions++;

                throw new RuntimeException('SUNAT no responde');
            });
        });
    }

    public function test_key_is_required(): void
    {
        $this->postJson($this->tenantUrl('demo', '_prueba/comandas'), ['plato' => 1])
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'IDEMPOTENCIA_REQUERIDA');

        $this->assertSame(0, $this->executions);
    }

    public function test_key_must_be_a_uuid(): void
    {
        $this->send('demo', 'no-es-uuid', ['plato' => 1])
            ->assertStatus(422)
            ->assertJsonPath('error.codigo', 'VALIDACION');

        $this->assertSame(0, $this->executions);
    }

    public function test_retry_returns_the_stored_response_without_executing_again(): void
    {
        $key = (string) Str::uuid();

        $this->send('demo', $key, ['plato' => 1])->assertStatus(201)->assertJsonPath('data.numero', 1);

        $this->send('demo', $key, ['plato' => 1])
            ->assertStatus(201)
            ->assertJsonPath('data.numero', 1)
            ->assertHeader('Idempotency-Replayed', 'true');

        $this->assertSame(1, $this->executions);
    }

    public function test_reusing_a_key_with_other_data_is_a_conflict(): void
    {
        $key = (string) Str::uuid();
        $this->send('demo', $key, ['plato' => 1])->assertStatus(201);

        $this->send('demo', $key, ['plato' => 2])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'IDEMPOTENCIA_CONFLICTO');

        $this->assertSame(1, $this->executions);
    }

    public function test_concurrent_request_with_the_same_key_is_not_executed(): void
    {
        $key = (string) Str::uuid();
        $body = ['plato' => 1];

        // La primera request reservo la clave y sigue ejecutandose (codigo_http nulo).
        $this->asTenant('demo', fn () => IdempotencyKey::create([
            'clave' => $key,
            'endpoint' => 'POST /api/v1/_prueba/comandas',
            'hash_solicitud' => hash('sha256', json_encode($body)),
        ]));

        $this->send('demo', $key, $body)
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'IDEMPOTENCIA_EN_PROCESO');

        $this->assertSame(0, $this->executions);
    }

    public function test_same_key_in_another_tenant_does_not_collide(): void
    {
        $key = (string) Str::uuid();

        $this->send('demo', $key, ['plato' => 1])->assertStatus(201);
        $this->send('donjose', $key, ['plato' => 1])->assertStatus(201);

        $this->assertSame(2, $this->executions);
        $this->assertSame(1, $this->asTenant('demo', fn () => DB::table('claves_idempotencia')->count()));
    }

    public function test_server_errors_are_not_stored_so_the_client_can_retry(): void
    {
        $key = (string) Str::uuid();

        $this->sendTo('_prueba/falla', $key)->assertStatus(500);
        $this->sendTo('_prueba/falla', $key)->assertStatus(500);

        $this->assertSame(2, $this->executions);
        $this->assertSame(0, $this->asTenant('demo', fn () => DB::table('claves_idempotencia')->count()));
    }

    public function test_cleanup_command_deletes_only_expired_keys_of_every_tenant(): void
    {
        foreach (['demo', 'donjose'] as $slug) {
            $this->asTenant($slug, function (): void {
                IdempotencyKey::create(['clave' => (string) Str::uuid(), 'endpoint' => 'POST /x', 'hash_solicitud' => str_repeat('a', 64), 'creado_en' => now()->subHours(25)]);
                IdempotencyKey::create(['clave' => (string) Str::uuid(), 'endpoint' => 'POST /x', 'hash_solicitud' => str_repeat('a', 64)]);
            });
        }

        $this->artisan('softflyer:limpiar-idempotencia')->assertSuccessful();

        $this->assertSame(1, $this->asTenant('demo', fn () => DB::table('claves_idempotencia')->count()));
        $this->assertSame(1, $this->asTenant('donjose', fn () => DB::table('claves_idempotencia')->count()));
    }

    private function send(string $slug, string $key, array $body)
    {
        return $this->postJson($this->tenantUrl($slug, '_prueba/comandas'), $body, [EnsureIdempotency::HEADER => $key]);
    }

    private function sendTo(string $path, string $key)
    {
        return $this->postJson($this->tenantUrl('demo', $path), [], [EnsureIdempotency::HEADER => $key]);
    }

    private function asTenant(string $slug, callable $callback): mixed
    {
        $context = $this->app->make(TenantContext::class);
        $context->set(Tenant::where('slug', $slug)->firstOrFail());

        try {
            return $callback();
        } finally {
            $context->clear();
        }
    }
}
