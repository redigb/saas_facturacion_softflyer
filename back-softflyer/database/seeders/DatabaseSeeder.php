<?php

namespace Database\Seeders;

use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use Illuminate\Database\Seeder;

/**
 * Datos locales: una cuenta demo publica con un restaurante armado y una cuenta
 * de pago recien registrada, que todavia debe configurar su local.
 */
class DatabaseSeeder extends Seeder
{
    public function run(ProvisionTenant $provision, TenantContext $context): void
    {
        $this->call([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);

        if (! Tenant::where('slug', 'demo')->exists()) {
            $provision->handle(
                ['slug' => 'demo', 'nombre' => 'Restaurante Demo', 'plan' => 'RESTAURANTE', 'es_demo' => true, 'estado' => TenantStatus::Active],
                ['nombre' => 'Usuario Demo', 'correo' => 'demo@softflyer.pe', 'contrasena' => 'demo-softflyer'],
            );
            $this->call(DemoRestauranteSeeder::class);
        }

        if (! Tenant::where('slug', 'donjose')->exists()) {
            $provision->handle(
                ['slug' => 'donjose', 'nombre' => 'Restaurante Don José', 'plan' => 'RESTAURANTE', 'estado' => TenantStatus::Active],
                ['nombre' => 'José Ramírez', 'correo' => 'admin@donjose.pe', 'contrasena' => 'donjose-2026'],
            );
        }

        // Administrador del backoffice solo para desarrollo. En produccion: php artisan softflyer:admin
        if (app()->isLocal()) {
            PlatformAdmin::firstOrCreate(['correo' => 'admin@softflyer.pe'], [
                'nombre' => 'Administrador Softflyer',
                'contrasena' => 'admin-softflyer-2026',
            ]);
        }

        $context->clear();
    }
}
