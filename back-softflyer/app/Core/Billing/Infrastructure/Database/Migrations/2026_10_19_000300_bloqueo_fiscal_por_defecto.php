<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Spec 017a: la configuración fiscal la maneja Softflyer. Los clientes nuevos nacen bloqueados
// (los existentes conservan su estado) y el backoffice deja constancia de cada carga.
return new class extends Migration
{
    private const ACTIONS_BEFORE = "'CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO', 'HOMOLOGACION_ACTUALIZADA', 'BLOQUEO_FISCAL_ACTUALIZADO'";

    public function up(): void
    {
        DB::statement('ALTER TABLE empresas ALTER COLUMN config_fiscal_bloqueada SET DEFAULT true');

        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.", 'CERTIFICADO_CARGADO', 'CREDENCIALES_SOL_ACTUALIZADAS', 'IGV_LOCAL_ACTUALIZADO'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE empresas ALTER COLUMN config_fiscal_bloqueada SET DEFAULT false');

        DB::statement('ALTER TABLE bitacora_plataforma DROP CONSTRAINT bitacora_plataforma_accion_check');
        DB::statement('ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('.self::ACTIONS_BEFORE.'))');
    }
};
