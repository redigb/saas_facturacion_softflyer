<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Lote 7 del Doc. 08 §10 (spec 009): cajas, turnos y movimientos manuales.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cajas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->string('nombre', 60);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo();

            $table->unique(['sucursal_id', 'nombre']);
        });
        RowLevelSecurity::enable('cajas');

        Schema::create('sesiones_caja', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('caja_id', 'cajas');
            $table->perteneceA('abierta_por', 'usuarios');
            $table->timestampTz('abierta_en');
            $table->decimal('monto_apertura', 12, 2);
            $table->perteneceA('cerrada_por', 'usuarios', nullable: true);
            $table->timestampTz('cerrada_en')->nullable();
            $table->decimal('monto_cierre_declarado', 12, 2)->nullable();
            $table->decimal('monto_cierre_calculado', 12, 2)->nullable(); // foto del arqueo, no se recalcula
            $table->string('estado', 10)->default('ABIERTA');
            $table->marcasDeTiempo();

            $table->index(['caja_id', 'estado']);
        });
        DB::statement("ALTER TABLE sesiones_caja ADD CONSTRAINT sesiones_caja_estado_check CHECK (estado IN ('ABIERTA', 'CERRADA'))");
        DB::statement('ALTER TABLE sesiones_caja ADD CONSTRAINT sesiones_caja_apertura_check CHECK (monto_apertura >= 0)');
        DB::statement("ALTER TABLE sesiones_caja ADD CONSTRAINT sesiones_caja_cierre_check CHECK ((estado = 'CERRADA') = (cerrada_en IS NOT NULL AND monto_cierre_declarado IS NOT NULL AND monto_cierre_calculado IS NOT NULL))");
        // Una caja no tiene dos turnos abiertos, ni una persona dos cajas abiertas a la vez.
        DB::statement("CREATE UNIQUE INDEX sesiones_caja_caja_abierta ON sesiones_caja (caja_id) WHERE estado = 'ABIERTA'");
        DB::statement("CREATE UNIQUE INDEX sesiones_caja_usuario_abierta ON sesiones_caja (abierta_por) WHERE estado = 'ABIERTA'");
        RowLevelSecurity::enable('sesiones_caja');

        Schema::create('movimientos_caja', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sesion_caja_id', 'sesiones_caja');
            $table->string('tipo', 8);
            $table->decimal('monto', 12, 2);
            $table->string('concepto', 120);
            $table->perteneceA('usuario_id', 'usuarios');
            $table->marcasDeTiempo();

            $table->index(['sesion_caja_id']);
        });
        DB::statement("ALTER TABLE movimientos_caja ADD CONSTRAINT movimientos_caja_tipo_check CHECK (tipo IN ('INGRESO', 'EGRESO'))");
        DB::statement('ALTER TABLE movimientos_caja ADD CONSTRAINT movimientos_caja_monto_check CHECK (monto > 0)');
        RowLevelSecurity::enable('movimientos_caja');
    }

    public function down(): void
    {
        foreach (['movimientos_caja', 'sesiones_caja', 'cajas'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
