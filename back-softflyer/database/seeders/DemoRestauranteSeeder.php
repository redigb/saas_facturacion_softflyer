<?php

namespace Database\Seeders;

use App\Core\Billing\Infrastructure\Persistence\DocumentSeries;
use App\Core\Inventory\Infrastructure\Persistence\Category;
use App\Core\Inventory\Infrastructure\Persistence\Product;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Restaurant\Infrastructure\Persistence\DiningRoom;
use App\Modules\Restaurant\Infrastructure\Persistence\ModifierGroup;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Llena la cuenta demo con un restaurante criollo de ejemplo: datos fiscales ficticios,
 * carta, estaciones y un plano de salon armado.
 */
class DemoRestauranteSeeder extends Seeder
{
    private const CARTA = [
        'Entradas' => ['#18b4fa', 'Cocina', [
            ['ENT-01', 'Ceviche clásico', 'PLATO', 32.00],
            ['ENT-02', 'Causa limeña', 'PLATO', 22.00],
            ['ENT-03', 'Papa a la huancaína', 'PLATO', 18.00],
        ]],
        'Fondos' => ['#0c5ea7', 'Cocina', [
            ['FON-01', 'Lomo saltado', 'PLATO', 42.00],
            ['FON-02', 'Ají de gallina', 'PLATO', 34.00],
            ['FON-03', 'Arroz con mariscos', 'PLATO', 45.00],
            ['FON-04', 'Pollo a la brasa (1/4)', 'PLATO', 28.00],
        ]],
        'Bebidas' => ['#fccd0b', 'Bar', [
            ['BEB-01', 'Chicha morada (jarra)', 'BEBIDA', 18.00],
            ['BEB-02', 'Limonada frozen', 'BEBIDA', 14.00],
            ['BEB-03', 'Pisco sour', 'BEBIDA', 26.00],
            ['BEB-04', 'Inca Kola 500 ml', 'BEBIDA', 7.00],
        ]],
        'Postres' => ['#e67e22', 'Cocina', [
            ['POS-01', 'Suspiro limeño', 'PLATO', 16.00],
            ['POS-02', 'Picarones', 'PLATO', 15.00],
        ]],
    ];

    public function run(TenantContext $context): void
    {
        $tenant = Tenant::where('slug', 'demo')->firstOrFail();
        $context->set($tenant);

        $company = Company::firstOrFail();
        $company->update([
            'ruc' => '20000000001',
            'razon_social' => 'RESTAURANTE DEMO S.A.C.',
            'direccion_fiscal' => 'Av. Larco 123, Miraflores',
            'ubigeo_id' => DB::table('ubigeos')->where('codigo', '150122')->value('id'),
        ]);
        $branch = Branch::where('es_principal', true)->firstOrFail();
        $branch->update(['direccion' => 'Av. Larco 123, Miraflores', 'ubigeo_id' => $company->ubigeo_id]);

        $this->seedSeries($company, $branch);
        $this->seedMenu($tenant);
        $this->seedFloorPlan($branch);
    }

    private function seedSeries(Company $company, Branch $branch): void
    {
        foreach (['03' => 'B001', '01' => 'F001'] as $type => $series) {
            DocumentSeries::create([
                'empresa_id' => $company->id,
                'sucursal_id' => $branch->id,
                'tipo_comprobante_id' => DB::table('tipos_comprobante')->where('codigo', $type)->value('id'),
                'serie' => $series,
            ]);
        }
    }

    private function seedMenu(Tenant $tenant): void
    {
        $unit = DB::table('unidades_medida')->where('codigo', 'NIU')->value('id');
        $taxed = DB::table('tipos_afectacion_igv')->where('codigo', '10')->value('id');
        $stations = [];
        $order = 0;

        foreach (self::CARTA as $categoryName => [$color, $stationName, $items]) {
            $stations[$stationName] ??= PreparationStation::create(['nombre' => $stationName])->id;

            $category = Category::create([
                'nombre' => $categoryName,
                'color' => $color,
                'orden' => $order++,
            ]);
            DB::table('categoria_estacion')->insert([
                'inquilino_id' => $tenant->id,
                'categoria_id' => $category->id,
                'estacion_preparacion_id' => $stations[$stationName],
            ]);

            foreach ($items as [$code, $name, $type, $price]) {
                Product::create([
                    'categoria_id' => $category->id,
                    'tipo' => $type,
                    'codigo' => $code,
                    'nombre' => $name,
                    'unidad_medida_id' => $unit,
                    'precio_venta' => $price,
                    'tipo_afectacion_igv_id' => $taxed,
                    'controla_stock' => $code === 'BEB-04',
                ]);
            }
        }

        $doneness = ModifierGroup::create(['nombre' => 'Término de la carne', 'seleccion_minima' => 1, 'seleccion_maxima' => 1]);
        foreach (['Jugoso', 'A punto', 'Tres cuartos', 'Bien cocido'] as $order => $name) {
            $doneness->modifiers()->create(['nombre' => $name, 'orden' => $order]);
        }

        $extras = ModifierGroup::create(['nombre' => 'Extras', 'seleccion_minima' => 0, 'seleccion_maxima' => 3]);
        foreach ([['Huevo frito', 3.00], ['Porción de arroz', 5.00], ['Papas fritas', 6.00]] as $order => [$name, $price]) {
            $extras->modifiers()->create(['nombre' => $name, 'precio_adicional' => $price, 'orden' => $order]);
        }

        $lomo = Product::where('codigo', 'FON-01')->value('id');
        DB::table('producto_modificador_grupo')->insert([
            ['inquilino_id' => $tenant->id, 'producto_id' => $lomo, 'modificador_grupo_id' => $doneness->id, 'orden' => 0],
            ['inquilino_id' => $tenant->id, 'producto_id' => $lomo, 'modificador_grupo_id' => $extras->id, 'orden' => 1],
        ]);
    }

    private function seedFloorPlan(Branch $branch): void
    {
        $main = DiningRoom::create(['sucursal_id' => $branch->id, 'nombre' => 'Salón principal', 'orden' => 0]);

        $main->elements()->createMany([
            ['tipo' => 'PARED', 'pos_x' => 0, 'pos_y' => 0, 'ancho' => 1000, 'alto' => 12],
            ['tipo' => 'PUERTA', 'etiqueta' => 'Ingreso', 'pos_x' => 440, 'pos_y' => 688, 'ancho' => 120, 'alto' => 12],
            ['tipo' => 'BARRA', 'etiqueta' => 'Barra', 'pos_x' => 760, 'pos_y' => 60, 'ancho' => 200, 'alto' => 70],
            ['tipo' => 'CAJA', 'etiqueta' => 'Caja', 'pos_x' => 820, 'pos_y' => 560, 'ancho' => 120, 'alto' => 80],
            ['tipo' => 'PLANTA', 'pos_x' => 30, 'pos_y' => 620, 'ancho' => 50, 'alto' => 50],
        ]);

        $tables = [];
        foreach ([[80, 80], [260, 80], [440, 80], [80, 260], [260, 260], [440, 260]] as $i => [$x, $y]) {
            $tables[] = ['codigo' => 'M'.($i + 1), 'capacidad' => 4, 'forma' => 'CUADRADA', 'pos_x' => $x, 'pos_y' => $y, 'ancho' => 110, 'alto' => 110];
        }
        $tables[] = ['codigo' => 'M7', 'capacidad' => 2, 'forma' => 'REDONDA', 'pos_x' => 120, 'pos_y' => 460, 'ancho' => 90, 'alto' => 90];
        $tables[] = ['codigo' => 'M8', 'capacidad' => 2, 'forma' => 'REDONDA', 'pos_x' => 300, 'pos_y' => 460, 'ancho' => 90, 'alto' => 90];
        $tables[] = ['codigo' => 'M9', 'capacidad' => 8, 'forma' => 'RECTANGULAR', 'pos_x' => 480, 'pos_y' => 440, 'ancho' => 220, 'alto' => 110];
        $main->tables()->createMany($tables);

        $terrace = DiningRoom::create(['sucursal_id' => $branch->id, 'nombre' => 'Terraza', 'orden' => 1, 'ancho' => 800, 'alto' => 500]);
        $terrace->tables()->createMany(array_map(fn (int $i) => [
            'codigo' => 'T'.$i, 'capacidad' => 4, 'forma' => 'REDONDA',
            'pos_x' => 80 + ($i - 1) * 170, 'pos_y' => 180, 'ancho' => 100, 'alto' => 100,
        ], [1, 2, 3, 4]));
    }
}
