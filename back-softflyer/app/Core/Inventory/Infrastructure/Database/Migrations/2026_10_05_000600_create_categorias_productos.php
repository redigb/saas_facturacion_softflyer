<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Catalogo de productos del Core: lo que se vende (platos, bebidas) y lo que se compra (insumos).
// Lo propio del restaurante (estaciones, modificadores) vive en Modules/Restaurant.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->string('nombre', 80);
            $table->char('color', 7)->nullable();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo(softDeletes: true);
        });
        DB::statement("ALTER TABLE categorias ADD CONSTRAINT categorias_color_check CHECK (color ~ '^#[0-9a-fA-F]{6}$')");
        DB::statement('CREATE UNIQUE INDEX categorias_nombre_unico ON categorias (inquilino_id, lower(nombre)) WHERE eliminado_en IS NULL');
        RowLevelSecurity::enable('categorias');

        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('categoria_id', 'categorias', nullable: true);
            $table->string('tipo', 10);
            $table->string('codigo', 30);
            $table->string('nombre', 120);
            $table->string('descripcion')->nullable();
            $table->foreignId('unidad_medida_id')->constrained('unidades_medida')->restrictOnDelete();
            $table->decimal('precio_venta', 12, 2)->nullable();
            $table->foreignId('tipo_afectacion_igv_id')->constrained('tipos_afectacion_igv')->restrictOnDelete();
            $table->boolean('es_vendible')->default(true);
            $table->boolean('controla_stock')->default(false);
            $table->string('imagen_ruta')->nullable();
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo(softDeletes: true);
        });
        DB::statement("ALTER TABLE productos ADD CONSTRAINT productos_tipo_check CHECK (tipo IN ('PLATO', 'BEBIDA', 'INSUMO'))");
        DB::statement('ALTER TABLE productos ADD CONSTRAINT productos_precio_check CHECK (precio_venta IS NULL OR precio_venta >= 0)');
        DB::statement('ALTER TABLE productos ADD CONSTRAINT productos_vendible_check CHECK (NOT es_vendible OR precio_venta IS NOT NULL)');
        DB::statement('CREATE UNIQUE INDEX productos_codigo_unico ON productos (inquilino_id, codigo) WHERE eliminado_en IS NULL');
        RowLevelSecurity::enable('productos');
    }

    public function down(): void
    {
        foreach (['productos', 'categorias'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
