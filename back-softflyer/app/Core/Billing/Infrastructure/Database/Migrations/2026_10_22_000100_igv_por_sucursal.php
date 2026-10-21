<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 017b: el IGV se decide por sucursal. La tasa de la sucursal pisa la de la empresa y `exonerado_amazonia`
// reemplaza a `opera_con_igv` (dice el motivo de la exoneración y qué leyenda lleva el comprobante). La
// configuración fiscal pasa a ser solo del backoffice: ya no hay candado por empresa.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO', 'HOMOLOGACION_ACTUALIZADA', 'BLOQUEO_FISCAL_ACTUALIZADO', 'CERTIFICADO_CARGADO', 'CREDENCIALES_SOL_ACTUALIZADAS', 'IGV_LOCAL_ACTUALIZADO'";

    public function up(): void
    {
        Schema::table('sucursales', function (Blueprint $table) {
            $table->unsignedSmallInteger('tasa_igv_id')->nullable();
            $table->foreign('tasa_igv_id')->references('id')->on('tasas_igv')->restrictOnDelete();
            $table->boolean('exonerado_amazonia')->default(false);
            // 2001 bienes, 2002 servicios (catálogo 15): la leyenda que SUNAT espera en lo exonerado por la Amazonía.
            $table->string('leyenda_amazonia', 4)->default('2001');
        });
        DB::statement('UPDATE sucursales SET exonerado_amazonia = NOT opera_con_igv');
        Schema::table('sucursales', fn (Blueprint $table) => $table->dropColumn('opera_con_igv'));

        // Lo firmado no cambia: la leyenda queda en el comprobante aunque la sucursal cambie después.
        Schema::table('comprobantes', fn (Blueprint $table) => $table->string('leyenda_codigo', 4)->nullable());
        Schema::table('empresas', fn (Blueprint $table) => $table->dropColumn('config_fiscal_bloqueada'));

        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'TASA_IGV_ACTUALIZADA', 'AMAZONIA_LOCAL_ACTUALIZADA'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');

        Schema::table('empresas', fn (Blueprint $table) => $table->boolean('config_fiscal_bloqueada')->default(true));
        Schema::table('comprobantes', fn (Blueprint $table) => $table->dropColumn('leyenda_codigo'));

        Schema::table('sucursales', fn (Blueprint $table) => $table->boolean('opera_con_igv')->default(true));
        DB::statement('UPDATE sucursales SET opera_con_igv = NOT exonerado_amazonia');
        Schema::table('sucursales', function (Blueprint $table) {
            $table->dropForeign(['tasa_igv_id']);
            $table->dropColumn(['tasa_igv_id', 'exonerado_amazonia', 'leyenda_amazonia']);
        });
    }
};
