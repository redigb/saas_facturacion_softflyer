<?php

namespace Tests\Feature\Restaurant\Concerns;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

/**
 * Restaurante de prueba listo para operar (specs 006 y 007): "donjose" con estaciones
 * Cocina y Bar, carta con modificadores, un salón con M1 y M2, un admin y un mozo.
 */
trait BuildsRestaurant
{
    protected Tenant $tenant;

    protected string $admin;

    protected string $waiter;

    /** @var array<string, int> */
    protected array $ids = [];

    protected function buildRestaurant(): void
    {
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);

        $this->tenant = $this->provision('donjose');
        $this->admin = $this->tokenFor($this->tenant, 'admin@donjose.pe');
        $this->waiter = $this->user('Mozo', 'mozo@donjose.pe');
        $this->menuAndFloor();
    }

    protected function menuAndFloor(): void
    {
        $this->ids['cocina'] = $this->as($this->admin, 'POST', 'estaciones', ['nombre' => 'Cocina'])->json('data.id');
        $this->ids['bar'] = $this->as($this->admin, 'POST', 'estaciones', ['nombre' => 'Bar'])->json('data.id');
        $fondos = $this->as($this->admin, 'POST', 'categorias', ['nombre' => 'Fondos', 'estacion_preparacion_id' => $this->ids['cocina']])->json('data.id');
        $bebidas = $this->as($this->admin, 'POST', 'categorias', ['nombre' => 'Bebidas', 'estacion_preparacion_id' => $this->ids['bar']])->json('data.id');

        $group = $this->as($this->admin, 'POST', 'modificador-grupos', [
            'nombre' => 'Término', 'seleccion_minima' => 1, 'seleccion_maxima' => 1,
            'modificadores' => [['nombre' => 'Jugoso', 'precio_adicional' => 3], ['nombre' => 'Bien cocido']],
        ])->json('data');
        [$this->ids['jugoso'], $this->ids['cocido']] = array_column($group['modificadores'], 'id');

        $this->ids['lomo'] = $this->as($this->admin, 'POST', 'productos', ['nombre' => 'Lomo saltado', 'tipo' => 'PLATO', 'precio_venta' => 42, 'categoria_id' => $fondos, 'modificador_grupo_ids' => [$group['id']]])->json('data.id');
        $this->ids['chicha'] = $this->as($this->admin, 'POST', 'productos', ['nombre' => 'Chicha morada', 'tipo' => 'BEBIDA', 'precio_venta' => 10, 'categoria_id' => $bebidas])->json('data.id');
        $this->ids['pan'] = $this->as($this->admin, 'POST', 'productos', ['nombre' => 'Pan al ajo', 'tipo' => 'PLATO', 'precio_venta' => 6])->json('data.id');

        $this->ids['salon'] = $this->as($this->admin, 'POST', 'salones', ['nombre' => 'Salón'])->json('data.id');
        $table = fn (string $code, int $x) => ['codigo' => $code, 'capacidad' => 4, 'forma' => 'CUADRADA', 'pos_x' => $x, 'pos_y' => 50, 'ancho' => 100, 'alto' => 100, 'rotacion' => 0];
        $plan = $this->as($this->admin, 'PUT', "salones/{$this->ids['salon']}/plano", ['version' => 1, 'mesas' => [$table('M1', 50), $table('M2', 200)], 'elementos' => []]);
        [$this->ids['m1'], $this->ids['m2']] = array_column($plan->json('data.mesas'), 'id');
        $this->ids['sucursal'] = $this->asTenant(fn () => (int) DB::table('sucursales')->value('id'));
    }

    protected function open(int $table, array $extra = []): TestResponse
    {
        return $this->as($this->waiter, 'POST', 'pedidos', ['tipo' => 'SALON', 'mesa_id' => $table] + $extra, idempotent: true);
    }

    protected function send(int $order, array $items): TestResponse
    {
        return $this->as($this->waiter, 'POST', "pedidos/{$order}/comandas", ['items' => $items], idempotent: true);
    }

    protected function as(string $token, string $method, string $path, array $body = [], bool $idempotent = false, ?string $key = null): TestResponse
    {
        $this->forget();
        $headers = $idempotent || $key ? ['Idempotency-Key' => $key ?? (string) Str::uuid()] : [];

        return $this->withToken($token)->json($method, $this->tenantUrl('donjose', $path), $body, $headers);
    }

    protected function user(string $role, string $email): string
    {
        return $this->asTenant(function () use ($role, $email) {
            $user = User::create(['nombre' => $role, 'correo' => $email, 'contrasena' => 'contrasena-segura']);
            DB::table('rol_usuario')->insert([
                'inquilino_id' => $this->tenant->id,
                'usuario_id' => $user->id,
                'rol_id' => DB::table('roles')->where('nombre', $role)->value('id'),
            ]);

            return $user->createToken('web')->plainTextToken;
        });
    }

    protected function forget(): void
    {
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
    }

    protected function asTenant(callable $callback): mixed
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($this->tenant);

        try {
            return $callback();
        } finally {
            $context->clear();
        }
    }

    protected function provision(string $slug): Tenant
    {
        $tenant = $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => 'RESTAURANTE', 'estado' => TenantStatus::Active],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
        $this->app->make(TenantContext::class)->clear();

        return $tenant;
    }

    protected function tokenFor(Tenant $tenant, string $email): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        $token = User::where('correo', $email)->firstOrFail()->createToken('web')->plainTextToken;
        $context->clear();

        return $token;
    }
}
