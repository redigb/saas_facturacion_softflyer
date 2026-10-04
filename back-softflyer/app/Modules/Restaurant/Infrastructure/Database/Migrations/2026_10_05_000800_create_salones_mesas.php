<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Plano editable del salon (Doc. 08 §7). Posiciones en unidades del lienzo, no en pixeles.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salones', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->string('nombre', 60);
            $table->unsignedInteger('ancho')->default(1000);
            $table->unsignedInteger('alto')->default(700);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo(softDeletes: true);
        });
        DB::statement('ALTER TABLE salones ADD CONSTRAINT salones_dimensiones_check CHECK (ancho > 0 AND alto > 0)');
        RowLevelSecurity::enable('salones');

        Schema::create('mesas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('salon_id', 'salones');
            $table->string('codigo', 10);
            $table->unsignedSmallInteger('capacidad')->default(4);
            $table->string('forma', 12)->default('CUADRADA');
            $this->geometry($table);
            $table->string('estado', 12)->default('LIBRE');
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo();

            $table->unique(['salon_id', 'codigo']);
        });
        DB::statement("ALTER TABLE mesas ADD CONSTRAINT mesas_forma_check CHECK (forma IN ('CUADRADA', 'REDONDA', 'RECTANGULAR'))");
        DB::statement("ALTER TABLE mesas ADD CONSTRAINT mesas_estado_check CHECK (estado IN ('LIBRE', 'OCUPADA', 'POR_COBRAR', 'BLOQUEADA'))");
        DB::statement('ALTER TABLE mesas ADD CONSTRAINT mesas_capacidad_check CHECK (capacidad > 0)');
        $this->geometryChecks('mesas');
        RowLevelSecurity::enable('mesas');

        Schema::create('elementos_plano', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('salon_id', 'salones');
            $table->string('tipo', 12);
            $table->string('etiqueta', 40)->nullable();
            $this->geometry($table);
            $table->smallInteger('capa')->default(0);
            $table->marcasDeTiempo();
        });
        DB::statement("ALTER TABLE elementos_plano ADD CONSTRAINT elementos_plano_tipo_check CHECK (tipo IN ('BARRA', 'PARED', 'PUERTA', 'VENTANA', 'COLUMNA', 'PLANTA', 'BANO', 'CAJA', 'COCINA', 'TEXTO'))");
        $this->geometryChecks('elementos_plano');
        RowLevelSecurity::enable('elementos_plano');
    }

    public function down(): void
    {
        foreach (['elementos_plano', 'mesas', 'salones'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }

    private function geometry(Blueprint $table): void
    {
        $table->decimal('pos_x', 8, 2)->default(0);
        $table->decimal('pos_y', 8, 2)->default(0);
        $table->decimal('ancho', 8, 2);
        $table->decimal('alto', 8, 2);
        $table->smallInteger('rotacion')->default(0);
    }

    private function geometryChecks(string $table): void
    {
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_geometria_check CHECK (ancho > 0 AND alto > 0 AND pos_x >= 0 AND pos_y >= 0 AND rotacion BETWEEN 0 AND 359)");
    }
};
