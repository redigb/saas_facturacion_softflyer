<?php

namespace Database\Seeders;

use App\Core\Tenancy\Infrastructure\Persistence\Plan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Permisos (desde config/softflyer.php) y planes del SaaS. Idempotente.
 */
class PermisoPlanSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('softflyer.permisos') as $code => [$module, $description]) {
            DB::table('permisos')->updateOrInsert(
                ['codigo' => $code],
                ['modulo' => $module, 'descripcion' => $description],
            );
        }

        // Precios por definir: los planes existen para modelar suscripcion y limites.
        Plan::updateOrCreate(['codigo' => 'PRUEBA'], [
            'nombre' => 'Prueba gratis',
            'max_sucursales' => 1,
            'max_usuarios' => 5,
            'max_comprobantes_mes' => 100,
            'modulos_incluidos' => ['restaurante'],
        ]);

        Plan::updateOrCreate(['codigo' => 'RESTAURANTE'], [
            'nombre' => 'Restaurante',
            'max_sucursales' => 3,
            'max_usuarios' => 30,
            'modulos_incluidos' => ['restaurante'],
        ]);
    }
}
