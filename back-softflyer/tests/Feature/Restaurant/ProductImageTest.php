<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\DatabaseTestCase;

/**
 * Spec 023: foto del plato (specs/023-fotos-de-platos/backend.md).
 */
class ProductImageTest extends DatabaseTestCase
{
    private Tenant $tenant;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);

        Storage::fake('public');
        $this->tenant = $this->provision('donjose');
        $this->admin = $this->tokenFor($this->tenant, 'admin@donjose.pe');
    }

    public function test_owner_uploads_a_photo_and_it_travels_in_the_product_and_the_menu(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Lomo saltado', 'tipo' => 'PLATO', 'precio_venta' => 42])->json('data.id');

        $url = $this->upload($product, UploadedFile::fake()->image('foto.jpg', 2400, 1600))
            ->assertOk()
            ->json('data.imagen_url');

        $this->assertIsString($url);
        $this->assertStringContainsString('/storage/productos/'.$this->tenant->id.'/', $url);

        $ruta = Product::find($product)->imagen_ruta;
        Storage::disk('public')->assertExists($ruta);

        $this->api('GET', 'carta')->assertJsonPath('data.productos.0.imagen_url', $url);
    }

    public function test_replacing_the_photo_deletes_the_previous_file(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Ceviche', 'tipo' => 'PLATO', 'precio_venta' => 32])->json('data.id');

        $this->upload($product, UploadedFile::fake()->image('una.jpg', 300, 300))->assertOk();
        $first = Product::find($product)->imagen_ruta;

        $this->upload($product, UploadedFile::fake()->image('dos.jpg', 300, 300))->assertOk();
        $second = Product::find($product)->imagen_ruta;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
    }

    public function test_removing_the_photo_clears_the_file_and_the_route(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Causa', 'tipo' => 'PLATO', 'precio_venta' => 22])->json('data.id');
        $this->upload($product, UploadedFile::fake()->image('foto.jpg', 300, 300))->assertOk();
        $ruta = Product::find($product)->imagen_ruta;

        $this->api('DELETE', "productos/{$product}/imagen")
            ->assertOk()
            ->assertJsonPath('data.imagen_url', null);

        Storage::disk('public')->assertMissing($ruta);
        $this->assertNull(Product::find($product)->imagen_ruta);
    }

    public function test_rejects_files_that_are_not_images_or_too_large(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Papa', 'tipo' => 'PLATO', 'precio_venta' => 18])->json('data.id');

        $this->withToken($this->admin)
            ->post($this->tenantUrl('donjose', "productos/{$product}/imagen"), ['imagen' => UploadedFile::fake()->createWithContent('nota.txt', 'hola')], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('error.codigo', 'VALIDACION')
            ->assertJsonStructure(['error' => ['detalles' => ['imagen']]]);

        $this->upload($product, UploadedFile::fake()->create('grande.jpg', 5000, 'image/jpeg'))
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['detalles' => ['imagen']]]);
    }

    public function test_waiter_cannot_upload_and_other_tenants_get_404(): void
    {
        $product = $this->api('POST', 'productos', ['nombre' => 'Chicha', 'tipo' => 'BEBIDA', 'precio_venta' => 10])->json('data.id');

        $waiter = $this->createWaiter();
        $this->withToken($waiter)
            ->post($this->tenantUrl('donjose', "productos/{$product}/imagen"), ['imagen' => UploadedFile::fake()->image('foto.jpg')], ['Accept' => 'application/json'])
            ->assertForbidden();

        $other = $this->provision('otro');
        $this->app['auth']->forgetGuards();
        $otherAdmin = $this->tokenFor($other, 'admin@otro.pe');

        $this->withToken($otherAdmin)
            ->post($this->tenantUrl('otro', "productos/{$product}/imagen"), ['imagen' => UploadedFile::fake()->image('foto.jpg')], ['Accept' => 'application/json'])
            ->assertNotFound();

        $this->withToken($otherAdmin)
            ->deleteJson($this->tenantUrl('otro', "productos/{$product}/imagen"))
            ->assertNotFound();
    }

    private function upload(int $product, UploadedFile $file): TestResponse
    {
        return $this->withToken($this->admin)
            ->post($this->tenantUrl('donjose', "productos/{$product}/imagen"), ['imagen' => $file], ['Accept' => 'application/json']);
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
