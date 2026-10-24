<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Backoffice: corregir los datos de un cliente y cancelarlo dejan constancia en la bitácora.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO', 'HOMOLOGACION_ACTUALIZADA', 'BLOQUEO_FISCAL_ACTUALIZADO', 'CERTIFICADO_CARGADO', 'CREDENCIALES_SOL_ACTUALIZADAS', 'IGV_LOCAL_ACTUALIZADO', 'TASA_IGV_ACTUALIZADA', 'AMAZONIA_LOCAL_ACTUALIZADA'";

    public function up(): void
    {
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'CLIENTE_EDITADO', 'CLIENTE_CANCELADO'))");
    }

    public function down(): void
    {
        DB::statement('DELETE FROM bitacora_plataforma WHERE accion IN (\'CLIENTE_EDITADO\', \'CLIENTE_CANCELADO\')');
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');
    }
};
