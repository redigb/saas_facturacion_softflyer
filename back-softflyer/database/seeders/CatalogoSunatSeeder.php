<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Catalogos globales (Doc. 08 §11.1). Idempotente: se puede correr en cada despliegue.
 */
class CatalogoSunatSeeder extends Seeder
{
    public function run(): void
    {
        $this->upsert('tipos_documento_identidad', [
            ['codigo' => '-', 'nombre' => 'Sin documento'],
            ['codigo' => '1', 'nombre' => 'DNI'],
            ['codigo' => '4', 'nombre' => 'Carné de extranjería'],
            ['codigo' => '6', 'nombre' => 'RUC'],
            ['codigo' => '7', 'nombre' => 'Pasaporte'],
        ]);

        $this->upsert('tipos_comprobante', [
            ['codigo' => '01', 'nombre' => 'Factura'],
            ['codigo' => '03', 'nombre' => 'Boleta de venta'],
            ['codigo' => '07', 'nombre' => 'Nota de crédito'],
            ['codigo' => '08', 'nombre' => 'Nota de débito'],
        ]);

        $this->upsert('monedas', [
            ['codigo' => 'PEN', 'nombre' => 'Sol', 'simbolo' => 'S/'],
            ['codigo' => 'USD', 'nombre' => 'Dólar estadounidense', 'simbolo' => 'US$'],
        ]);

        $this->upsert('unidades_medida', [
            ['codigo' => 'NIU', 'nombre' => 'Unidad'],
            ['codigo' => 'ZZ', 'nombre' => 'Servicio'],
            ['codigo' => 'KGM', 'nombre' => 'Kilogramo'],
            ['codigo' => 'GRM', 'nombre' => 'Gramo'],
            ['codigo' => 'LTR', 'nombre' => 'Litro'],
            ['codigo' => 'MLT', 'nombre' => 'Mililitro'],
        ]);

        $this->upsert('tipos_afectacion_igv', [
            ['codigo' => '10', 'nombre' => 'Gravado - Operación onerosa'],
            ['codigo' => '20', 'nombre' => 'Exonerado - Operación onerosa'],
            ['codigo' => '30', 'nombre' => 'Inafecto - Operación onerosa'],
        ]);

        $this->upsert('motivos_nota_credito', [
            ['codigo' => '01', 'nombre' => 'Anulación de la operación'],
            ['codigo' => '02', 'nombre' => 'Anulación por error en el RUC'],
            ['codigo' => '03', 'nombre' => 'Corrección por error en la descripción'],
            ['codigo' => '04', 'nombre' => 'Descuento global'],
            ['codigo' => '05', 'nombre' => 'Descuento por ítem'],
            ['codigo' => '06', 'nombre' => 'Devolución total'],
            ['codigo' => '07', 'nombre' => 'Devolución por ítem'],
        ]);

        $this->upsert('motivos_nota_debito', [
            ['codigo' => '01', 'nombre' => 'Intereses por mora'],
            ['codigo' => '02', 'nombre' => 'Aumento en el valor'],
            ['codigo' => '03', 'nombre' => 'Penalidades u otros conceptos'],
        ]);

        // Solo la tasa general. Las tasas reducidas para MYPE de restaurantes (Ley 31556 y prorrogas)
        // deben cargarse con sus vigencias exactas, validadas por un contador (Doc. 08 §11.1).
        DB::table('tasas_igv')->updateOrInsert(
            ['codigo' => 'GENERAL', 'vigente_desde' => '2011-03-01'],
            ['nombre' => 'IGV general (16 % IGV + 2 % IPM)', 'tasa' => 18.00],
        );

        // Muestra minima de Lima. El catalogo INEI completo se carga aparte.
        $this->upsert('ubigeos', [
            ['codigo' => '150101', 'departamento' => 'LIMA', 'provincia' => 'LIMA', 'distrito' => 'LIMA'],
            ['codigo' => '150104', 'departamento' => 'LIMA', 'provincia' => 'LIMA', 'distrito' => 'BARRANCO'],
            ['codigo' => '150122', 'departamento' => 'LIMA', 'provincia' => 'LIMA', 'distrito' => 'MIRAFLORES'],
        ]);

        $this->upsert('metodos_pago', [
            ['codigo' => 'EFECTIVO', 'nombre' => 'Efectivo', 'es_efectivo' => true],
            ['codigo' => 'TARJETA_DEBITO', 'nombre' => 'Tarjeta de débito', 'es_efectivo' => false],
            ['codigo' => 'TARJETA_CREDITO', 'nombre' => 'Tarjeta de crédito', 'es_efectivo' => false],
            ['codigo' => 'YAPE', 'nombre' => 'Yape', 'es_efectivo' => false],
            ['codigo' => 'PLIN', 'nombre' => 'Plin', 'es_efectivo' => false],
            ['codigo' => 'TRANSFERENCIA', 'nombre' => 'Transferencia bancaria', 'es_efectivo' => false],
            ['codigo' => 'PERSONAL', 'nombre' => 'Personal', 'es_efectivo' => false],
            ['codigo' => 'APPS_DELIVERY', 'nombre' => 'Apps de delivery', 'es_efectivo' => false],
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function upsert(string $table, array $rows): void
    {
        foreach ($rows as $row) {
            DB::table($table)->updateOrInsert(['codigo' => $row['codigo']], $row);
        }
    }
}
