<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;

/**
 * Spec 002: contrato de la carta (specs/002-carta/backend.md).
 */
class MenuTest extends DatabaseTestCase
{
    private Tenant $tenant;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);

        $this->tenant = $this->provision('donjose');
        $this->admin = $this->tokenFor($this->tenant, 'admin@donjose.pe');
    }

    public function test_owner_creates_a_dish_with_only_name_price_and_category(): void
    {
        $kitchen = $this->api('POST', 'estaciones', ['nombre' => 'Cocina'])->assertCreated()->json('data.id');
        $category = $this->api('POST', 'categorias', ['nombre' => 'Fondos', 'color' => '#2E86DE', 'estacion_preparacion_id' => $kitchen])
            ->assertCreated()
            ->assertJsonPath('data.estacion_preparacion_id', $kitchen)
            ->assertJsonPath('data.productos_count', 0)
            ->json('data.id');

        $this->api('POST', 'productos', ['nombre' => 'Lomo saltado', 'tipo' => 'PLATO', 'precio_venta' => 42, 'categoria_id' => $category])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'PRD-0001')
            ->assertJsonPath('data.precio_venta', '42.00')
            ->assertJsonPath('data.unidad_medida.codigo', 'NIU')
            ->assertJsonPath('data.tipo_afectacion_igv.codigo', '10')
            ->assertJsonPath('data.estacion_preparacion_id', null)
            ->assertJsonPath('data.estacion_efectiva_id', $kitchen)
            ->assertJsonPath('data.es_activo', true);

        $this->api('POST', 'productos', ['nombre' => 'Arroz chaufa', 'tipo' => 'PLATO', 'precio_venta' => '28.5'])
            ->assertJsonPath('data.codigo', 'PRD-0002')
            ->assertJsonPath('data.precio_venta', '28.50');
    }

    public function test_product_station_overrides_the_category_station(): void
    {
        $kitchen = $this->api('POST', 'estaciones', ['nombre' => 'Cocina'])->json('data.id');
        $bar = $this->api('POST', 'estaciones', ['nombre' => 'Bar'])->json('data.id');
        $category = $this->api('POST', 'categorias', ['nombre' => 'Postres', 'estacion_preparacion_id' => $kitchen])->json('data.id');
        $product = $this->api('POST', 'productos', ['nombre' => 'Helado', 'tipo' => 'PLATO', 'precio_venta' => 10, 'categoria_id' => $category])->json('data.id');

        $this->api('PATCH', "productos/{$product}", ['estacion_preparacion_id' => $bar])
            ->assertOk()
            ->assertJsonPath('data.estacion_efectiva_id', $bar);

        $this->api('PATCH', "productos/{$product}", ['estacion_preparacion_id' => null])
            ->assertJsonPath('data.estacion_efectiva_id', $kitchen);
    }

    public function test_validation_errors_use_the_standard_format(): void
    {
        $this->api('POST', 'categorias', ['nombre' => 'Bebidas'])->assertCreated();

        $this->api('POST', 'categorias', ['nombre' => 'BEBIDAS'])
            ->assertStatus(422)
            ->assertJsonPath('error.codigo', 'VALIDACION')
            ->assertJsonPath('error.detalles.nombre.0', 'Ya tienes una categoría con ese nombre.');

        $this->api('POST', 'productos', ['nombre' => 'Sin precio', 'tipo' => 'PLATO'])
            ->assertStatus(422)
            ->assertJsonPath('error.detalles.precio_venta.0', 'Ingresa el precio.');

        $this->api('POST', 'productos', ['nombre' => 'Insumo', 'tipo' => 'INSUMO', 'precio_venta' => 1])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['detalles' => ['tipo']]]);
    }

    public function test_waiter_reads_the_menu_but_cannot_change_it(): void
    {
        $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->assertCreated();
        $waiter = $this->createWaiter();

        $this->withToken($waiter)->getJson($this->tenantUrl('donjose', 'carta'))->assertOk();
        $this->withToken($waiter)->getJson($this->tenantUrl('donjose', 'categorias'))->assertOk()->assertJsonCount(1, 'data');

        $this->withToken($waiter)->postJson($this->tenantUrl('donjose', 'categorias'), ['nombre' => 'Postres'])
            ->assertForbidden()
            ->assertJsonPath('error.codigo', 'NO_AUTORIZADO');
        $this->withToken($waiter)->postJson($this->tenantUrl('donjose', 'productos'), ['nombre' => 'X', 'tipo' => 'PLATO', 'precio_venta' => 1])
            ->assertForbidden();
    }

    public function test_another_tenant_product_is_not_found(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Ceviche', 'tipo' => 'PLATO', 'precio_venta' => 32])->json('data.id');

        $other = $this->provision('otro');
        $this->app['auth']->forgetGuards();
        $otherAdmin = $this->tokenFor($other, 'admin@otro.pe');

        $this->withToken($otherAdmin)->getJson($this->tenantUrl('otro', "productos/{$product}"))
            ->assertNotFound()
            ->assertJsonPath('error.codigo', 'RECURSO_NO_ENCONTRADO');
        $this->withToken($otherAdmin)->patchJson($this->tenantUrl('otro', "productos/{$product}"), ['precio_venta' => 1])
            ->assertNotFound();
        $this->withToken($otherAdmin)->getJson($this->tenantUrl('otro', 'carta'))
            ->assertJsonCount(0, 'data.productos');
    }

    public function test_category_with_active_products_cannot_be_deleted(): void
    {
        $category = $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->json('data.id');
        $product = $this->api('POST', 'productos', ['nombre' => 'Lomo', 'tipo' => 'PLATO', 'precio_venta' => 42, 'categoria_id' => $category])->json('data.id');

        $this->api('DELETE', "categorias/{$category}")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'CATEGORIA_CON_PRODUCTOS');

        $this->api('PATCH', "productos/{$product}", ['es_activo' => false])->assertOk();
        $this->api('DELETE', "categorias/{$category}")->assertNoContent();

        $this->api('GET', "productos/{$product}")->assertJsonPath('data.categoria_id', null);
        $this->api('GET', 'categorias')->assertJsonCount(0, 'data');
    }

    public function test_categories_are_reordered(): void
    {
        $a = $this->api('POST', 'categorias', ['nombre' => 'Entradas'])->json('data.id');
        $b = $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->json('data.id');
        $c = $this->api('POST', 'categorias', ['nombre' => 'Postres'])->json('data.id');

        $this->api('PUT', 'categorias/orden', ['ids' => [$c, $a, $b]])->assertNoContent();

        $this->assertSame([$c, $a, $b], array_column($this->api('GET', 'categorias')->json('data'), 'id'));
    }

    public function test_modifier_groups_replace_their_options_and_cannot_be_deleted_while_in_use(): void
    {
        $group = $this->api('POST', 'modificador-grupos', [
            'nombre' => 'Término de la carne',
            'seleccion_minima' => 1,
            'seleccion_maxima' => 1,
            'modificadores' => [['nombre' => 'Jugoso'], ['nombre' => 'Bien cocido']],
        ])->assertCreated()->assertJsonCount(2, 'data.modificadores')->json('data');

        $juicy = $group['modificadores'][0];
        $this->api('PATCH', "modificador-grupos/{$group['id']}", [
            'modificadores' => [['id' => $juicy['id'], 'nombre' => 'Jugoso'], ['nombre' => 'A punto', 'precio_adicional' => 2]],
        ])
            ->assertOk()
            ->assertJsonPath('data.modificadores.0.id', $juicy['id'])
            ->assertJsonPath('data.modificadores.1.nombre', 'A punto')
            ->assertJsonPath('data.modificadores.1.precio_adicional', '2.00')
            ->assertJsonCount(2, 'data.modificadores');

        $this->api('POST', 'modificador-grupos', ['nombre' => 'Malo', 'seleccion_minima' => 3, 'seleccion_maxima' => 1, 'modificadores' => [['nombre' => 'X']]])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['detalles' => ['seleccion_minima']]]);

        $this->api('POST', 'productos', ['nombre' => 'Lomo', 'tipo' => 'PLATO', 'precio_venta' => 42, 'modificador_grupo_ids' => [$group['id']]])
            ->assertJsonPath('data.modificador_grupo_ids', [$group['id']]);

        $this->api('DELETE', "modificador-grupos/{$group['id']}")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'GRUPO_EN_USO');
    }

    public function test_menu_contains_only_active_and_sellable_items_and_supports_etag(): void
    {
        $kitchen = $this->api('POST', 'estaciones', ['nombre' => 'Cocina'])->json('data.id');
        $category = $this->api('POST', 'categorias', ['nombre' => 'Fondos', 'estacion_preparacion_id' => $kitchen])->json('data.id');
        $hidden = $this->api('POST', 'categorias', ['nombre' => 'Oculta', 'es_activa' => false])->json('data.id');
        $lomo = $this->api('POST', 'productos', ['nombre' => 'Lomo', 'tipo' => 'PLATO', 'precio_venta' => 42, 'categoria_id' => $category])->json('data.id');
        $this->api('POST', 'productos', ['nombre' => 'Agotado', 'tipo' => 'PLATO', 'precio_venta' => 10, 'categoria_id' => $category, 'es_activo' => false]);
        $this->api('POST', 'productos', ['nombre' => 'En oculta', 'tipo' => 'PLATO', 'precio_venta' => 10, 'categoria_id' => $hidden]);

        $response = $this->api('GET', 'carta')
            ->assertOk()
            ->assertJsonCount(1, 'data.categorias')
            ->assertJsonPath('data.categorias.0.producto_ids', [$lomo])
            ->assertJsonCount(1, 'data.productos')
            ->assertJsonPath('data.productos.0.precio_venta', '42.00')
            ->assertJsonPath('data.productos.0.estacion_efectiva_id', $kitchen)
            ->assertJsonPath('data.estaciones.0.nombre', 'Cocina');

        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $response->json('data.version'));
        $etag = $response->headers->get('ETag');
        $this->assertNotEmpty($etag);

        $this->withToken($this->admin)->getJson($this->tenantUrl('donjose', 'carta'), ['If-None-Match' => $etag])
            ->assertStatus(304);

        $this->api('PATCH', "productos/{$lomo}", ['precio_venta' => 45]);

        $this->withToken($this->admin)->getJson($this->tenantUrl('donjose', 'carta'), ['If-None-Match' => $etag])
            ->assertOk()
            ->assertJsonPath('data.productos.0.precio_venta', '45.00');
    }

    public function test_menu_product_ids_are_always_json_arrays(): void
    {
        // Regresión: con varias categorías, los ids de la segunda salían como objeto JSON
        // ({"2": 17}) y la pantalla del mozo no podía leer la carta.
        $fondos = $this->api('POST', 'categorias', ['nombre' => 'Fondos'])->json('data.id');
        $bebidas = $this->api('POST', 'categorias', ['nombre' => 'Bebidas'])->json('data.id');
        $lomo = $this->api('POST', 'productos', ['nombre' => 'Lomo', 'tipo' => 'PLATO', 'precio_venta' => 42, 'categoria_id' => $fondos])->json('data.id');
        $aji = $this->api('POST', 'productos', ['nombre' => 'Ají de gallina', 'tipo' => 'PLATO', 'precio_venta' => 34, 'categoria_id' => $fondos])->json('data.id');
        $chicha = $this->api('POST', 'productos', ['nombre' => 'Chicha', 'tipo' => 'BEBIDA', 'precio_venta' => 10, 'categoria_id' => $bebidas])->json('data.id');

        $raw = $this->api('GET', 'carta')->assertOk()->getContent();

        $this->assertStringContainsString('"producto_ids":['.$aji.','.$lomo.']', $raw);
        $this->assertStringContainsString('"producto_ids":['.$chicha.']', $raw);
        $this->assertStringNotContainsString('"producto_ids":{', $raw);
    }

    public function test_products_are_paginated_and_searchable(): void
    {
        foreach (['Ceviche', 'Causa', 'Lomo saltado'] as $name) {
            $this->api('POST', 'productos', ['nombre' => $name, 'tipo' => 'PLATO', 'precio_venta' => 20]);
        }

        $this->api('GET', 'productos?por_pagina=2&pagina=2')
            ->assertOk()
            ->assertJsonPath('meta', ['pagina_actual' => 2, 'por_pagina' => 2, 'total' => 3])
            ->assertJsonCount(1, 'data');

        $this->api('GET', 'productos?buscar=ca')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.nombre', 'Causa');
    }

    public function test_catalogs_list_units_and_igv_affectations(): void
    {
        $this->api('GET', 'carta/catalogos')
            ->assertOk()
            ->assertJsonFragment(['codigo' => 'NIU'])
            ->assertJsonFragment(['codigo' => '10']);
    }

    private function api(string $method, string $path, array $body = []): TestResponse
    {
        return $this->withToken($this->admin)->json($method, $this->tenantUrl('donjose', $path), $body);
    }

    private function provision(string $slug): Tenant
    {
        $tenant = $this->app->make(ProvisionTenant::class)->handle(
            ['slug' => $slug, 'nombre' => ucfirst($slug), 'plan' => 'RESTAURANTE', 'estado' => TenantStatus::Active],
            ['nombre' => 'Admin', 'correo' => "admin@{$slug}.pe", 'contrasena' => 'contrasena-segura'],
        );
        $this->app->make(TenantContext::class)->clear();

        return $tenant;
    }

    private function tokenFor(Tenant $tenant, string $email): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        $token = User::where('correo', $email)->firstOrFail()->createToken('web')->plainTextToken;
        $context->clear();

        return $token;
    }

    private function createWaiter(): string
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($this->tenant);

        $waiter = User::create(['nombre' => 'Mozo', 'correo' => 'mozo@donjose.pe', 'contrasena' => 'contrasena-segura']);
        DB::table('rol_usuario')->insert([
            'inquilino_id' => $this->tenant->id,
            'usuario_id' => $waiter->id,
            'rol_id' => DB::table('roles')->where('nombre', 'Mozo')->value('id'),
        ]);
        $context->clear();
        $this->app['auth']->forgetGuards();

        return $waiter->createToken('web')->plainTextToken;
    }
}
