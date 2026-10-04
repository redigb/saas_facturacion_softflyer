<?php

namespace Tests;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Pruebas contra PostgreSQL real: las migraciones corren como dueno del esquema
 * y la API como softflyer_app, para que RLS aplique igual que en produccion.
 */
abstract class DatabaseTestCase extends TestCase
{
    use RefreshDatabase {
        migrateFreshUsing as baseMigrateFreshUsing;
    }

    protected function migrateFreshUsing(): array
    {
        return ['--database' => 'pgsql_owner'] + $this->baseMigrateFreshUsing();
    }

    protected function createTenant(string $slug, array $attributes = []): Tenant
    {
        return Tenant::create($attributes + [
            'slug' => $slug,
            'nombre' => ucfirst($slug),
            'estado' => TenantStatus::Active,
        ]);
    }

    protected function createUser(Tenant $tenant, array $attributes = []): User
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);

        $user = User::create($attributes + [
            'nombre' => 'Usuario '.$tenant->slug,
            'correo' => "admin@{$tenant->slug}.pe",
            'contrasena' => 'contrasena-segura',
        ]);

        $context->clear();

        return $user;
    }

    protected function tenantUrl(string $slug, string $path): string
    {
        return "http://{$slug}.localhost/api/v1/{$path}";
    }
}
