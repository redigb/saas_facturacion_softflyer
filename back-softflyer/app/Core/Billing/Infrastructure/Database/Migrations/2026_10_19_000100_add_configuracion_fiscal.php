<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Configuración fiscal (spec 017a): tasa de IGV elegida por la empresa y titular del certificado.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO'";

    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            // Nulo = la tasa general vigente.
            $table->unsignedSmallInteger('tasa_igv_id')->nullable();
            $table->foreign('tasa_igv_id')->references('id')->on('tasas_igv')->restrictOnDelete();
        });

        Schema::table('certificados_digitales', function (Blueprint $table) {
            $table->string('titular', 200)->nullable();
        });

        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'HOMOLOGACION_ACTUALIZADA'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');

        Schema::table('certificados_digitales', fn (Blueprint $table) => $table->dropColumn('titular'));
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropForeign(['tasa_igv_id']);
            $table->dropColumn('tasa_igv_id');
        });
    }
};
