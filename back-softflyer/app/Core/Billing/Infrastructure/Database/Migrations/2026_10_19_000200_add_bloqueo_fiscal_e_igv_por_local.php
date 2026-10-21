<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 017a: Softflyer puede bloquear la configuración fiscal del cliente, y cada local dice si opera con IGV.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO', 'HOMOLOGACION_ACTUALIZADA'";

    public function up(): void
    {
        Schema::table('empresas', fn (Blueprint $table) => $table->boolean('config_fiscal_bloqueada')->default(false));
        // Verdadero por defecto: solo los locales en zonas exoneradas (p. ej. Amazonía) lo apagan.
        Schema::table('sucursales', fn (Blueprint $table) => $table->boolean('opera_con_igv')->default(true));

        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'BLOQUEO_FISCAL_ACTUALIZADO'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');

        Schema::table('sucursales', fn (Blueprint $table) => $table->dropColumn('opera_con_igv'));
        Schema::table('empresas', fn (Blueprint $table) => $table->dropColumn('config_fiscal_bloqueada'));
    }
};
