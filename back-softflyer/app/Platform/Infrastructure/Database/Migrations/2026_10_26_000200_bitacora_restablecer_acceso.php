<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Spec 035: soporte envia un enlace para que un usuario del cliente cree su contrasena.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO', 'HOMOLOGACION_ACTUALIZADA', 'BLOQUEO_FISCAL_ACTUALIZADO', 'CERTIFICADO_CARGADO', 'CREDENCIALES_SOL_ACTUALIZADAS', 'IGV_LOCAL_ACTUALIZADO', 'TASA_IGV_ACTUALIZADA', 'AMAZONIA_LOCAL_ACTUALIZADA', 'CLIENTE_EDITADO', 'CLIENTE_CANCELADO'";

    public function up(): void
    {
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'ACCESO_RESTABLECIDO'))");
    }

    public function down(): void
    {
        DB::statement("DELETE FROM bitacora_plataforma WHERE accion = 'ACCESO_RESTABLECIDO'");
        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');
    }
};
