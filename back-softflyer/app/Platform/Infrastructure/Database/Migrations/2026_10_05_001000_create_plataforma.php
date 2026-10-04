<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Backoffice del dueno de la plataforma. Tablas globales, fuera de cualquier inquilino.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administradores_plataforma', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('correo')->unique();
            $table->string('contrasena');
            $table->boolean('es_activo')->default(true);
            $table->timestampTz('ultimo_acceso_en')->nullable();
            $table->timestampTz('creado_en')->nullable();
            $table->timestampTz('actualizado_en')->nullable();
        });

        // Toda accion sobre un cliente queda registrada: quien, que y con que datos.
        Schema::create('bitacora_plataforma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('administrador_id')->constrained('administradores_plataforma')->restrictOnDelete();
            $table->foreignId('inquilino_id')->nullable()->constrained('inquilinos')->nullOnDelete();
            $table->string('accion', 40);
            $table->jsonb('detalle')->default('{}');
            $table->timestampTz('creado_en')->useCurrent();

            $table->index(['inquilino_id', 'creado_en']);
        });
        DB::statement("ALTER TABLE bitacora_plataforma ADD CONSTRAINT bitacora_plataforma_accion_check CHECK (accion IN ('CLIENTE_CREADO', 'PLAN_ACTIVADO', 'PRUEBA_EXTENDIDA', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'ENLACE_REENVIADO'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('bitacora_plataforma');
        Schema::dropIfExists('administradores_plataforma');
    }
};
