<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 039: promociones de precio por plato o categoría, con vigencia por fecha, día y horario.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promociones', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->string('nombre', 80);
            $table->string('descripcion', 160)->nullable();
            $table->string('tipo', 12);
            $table->decimal('valor', 12, 2);
            $table->timestampTz('desde');
            $table->timestampTz('hasta');
            // ISO 1 = lunes … 7 = domingo. Nulo = todos los días.
            $table->json('dias_semana')->nullable();
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->unsignedSmallInteger('prioridad')->default(0);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo();

            $table->index(['es_activa', 'desde', 'hasta']);
        });
        DB::statement("ALTER TABLE promociones ADD CONSTRAINT promociones_tipo_check CHECK (tipo IN ('PORCENTAJE', 'PRECIO_FIJO'))");
        DB::statement('ALTER TABLE promociones ADD CONSTRAINT promociones_valor_check CHECK (valor > 0)');
        DB::statement("ALTER TABLE promociones ADD CONSTRAINT promociones_porcentaje_check CHECK (tipo <> 'PORCENTAJE' OR valor <= 100)");
        DB::statement('ALTER TABLE promociones ADD CONSTRAINT promociones_fechas_check CHECK (hasta > desde)');
        DB::statement('ALTER TABLE promociones ADD CONSTRAINT promociones_horario_check CHECK ((hora_inicio IS NULL) = (hora_fin IS NULL) AND (hora_fin IS NULL OR hora_fin > hora_inicio))');
        RowLevelSecurity::enable('promociones');

        Schema::create('promocion_producto', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('promocion_id', 'promociones');
            $table->perteneceA('producto_id', 'productos');

            $table->unique(['promocion_id', 'producto_id']);
        });
        RowLevelSecurity::enable('promocion_producto');

        Schema::create('promocion_categoria', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('promocion_id', 'promociones');
            $table->perteneceA('categoria_id', 'categorias');

            $table->unique(['promocion_id', 'categoria_id']);
        });
        RowLevelSecurity::enable('promocion_categoria');
    }

    public function down(): void
    {
        foreach (['promocion_categoria', 'promocion_producto', 'promociones'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
