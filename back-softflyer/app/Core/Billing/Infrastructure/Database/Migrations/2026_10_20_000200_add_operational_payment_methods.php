<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('metodos_pago')->upsert([
            ['codigo' => 'PERSONAL', 'nombre' => 'Personal', 'es_efectivo' => false],
            ['codigo' => 'APPS_DELIVERY', 'nombre' => 'Apps de delivery', 'es_efectivo' => false],
        ], ['codigo'], ['nombre', 'es_efectivo']);
    }

    public function down(): void
    {
        $used = DB::table('pagos')->whereIn('metodo_pago_id', DB::table('metodos_pago')->whereIn('codigo', ['PERSONAL', 'APPS_DELIVERY'])->select('id'))->exists();

        if (! $used) {
            DB::table('metodos_pago')->whereIn('codigo', ['PERSONAL', 'APPS_DELIVERY'])->delete();
        }
    }
};
