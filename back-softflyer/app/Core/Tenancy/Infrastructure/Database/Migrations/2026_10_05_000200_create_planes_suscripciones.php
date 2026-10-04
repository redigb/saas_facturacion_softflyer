<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Planes del SaaS y ciclo de vida de la suscripcion (Doc. 03 §3).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 60);
            $table->decimal('precio_mensual', 12, 2)->default(0);
            $table->unsignedInteger('max_sucursales')->nullable();
            $table->unsignedInteger('max_usuarios')->nullable();
            $table->unsignedInteger('max_comprobantes_mes')->nullable();
            $table->jsonb('modulos_incluidos')->default('[]');
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo();
        });

        Schema::create('suscripciones', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->foreignId('plan_id')->constrained('planes')->restrictOnDelete();
            $table->string('estado', 20);
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento');
            $table->unsignedSmallInteger('dias_gracia')->default(15);
            $table->marcasDeTiempo();

            $table->index(['inquilino_id', 'fecha_vencimiento']);
        });
        DB::statement("ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_estado_check CHECK (estado IN ('PRUEBA', 'ACTIVA', 'MOROSA', 'SUSPENDIDA', 'CANCELADA'))");
        DB::statement('ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_fechas_check CHECK (fecha_vencimiento >= fecha_inicio)');
        RowLevelSecurity::enable('suscripciones');

        Schema::create('uso_inquilino', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->char('periodo', 7);
            $table->unsignedInteger('comprobantes_emitidos')->default(0);
            $table->unsignedInteger('sucursales_activas')->default(0);
            $table->unsignedInteger('usuarios_activos')->default(0);
            $table->marcasDeTiempo();

            $table->unique(['inquilino_id', 'periodo']);
        });
        DB::statement("ALTER TABLE uso_inquilino ADD CONSTRAINT uso_inquilino_periodo_check CHECK (periodo ~ '^[0-9]{4}-[0-9]{2}$')");
        RowLevelSecurity::enable('uso_inquilino');
    }

    public function down(): void
    {
        foreach (['uso_inquilino', 'suscripciones'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
        Schema::dropIfExists('planes');
    }
};
