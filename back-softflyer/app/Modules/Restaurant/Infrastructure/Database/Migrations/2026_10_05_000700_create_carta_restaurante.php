<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Lo que la carta necesita solo en un restaurante (Doc. 08 §5):
// a que estacion va cada plato y sus modificadores agrupados.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estaciones_preparacion', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->string('nombre', 60);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo();

            $table->unique(['inquilino_id', 'nombre']);
        });
        RowLevelSecurity::enable('estaciones_preparacion');

        // Estacion por defecto de una categoria y, si hace falta, la de un producto puntual.
        // Viven aqui y no en categorias/productos para que el Core no dependa del modulo.
        foreach (['categoria_estacion' => ['categoria_id', 'categorias'], 'producto_estacion' => ['producto_id', 'productos']] as $name => [$column, $parent]) {
            Schema::create($name, function (Blueprint $table) use ($column, $parent) {
                $table->unsignedBigInteger('inquilino_id');
                $table->perteneceA($column, $parent)->primary();
                $table->perteneceA('estacion_preparacion_id', 'estaciones_preparacion');

                $table->foreign('inquilino_id')->references('id')->on('inquilinos')->restrictOnDelete();
            });
            RowLevelSecurity::enable($name);
        }

        Schema::create('modificador_grupos', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->string('nombre', 60);
            $table->unsignedSmallInteger('seleccion_minima')->default(0);
            $table->unsignedSmallInteger('seleccion_maxima')->default(1);
            $table->marcasDeTiempo();
        });
        DB::statement('ALTER TABLE modificador_grupos ADD CONSTRAINT modificador_grupos_seleccion_check CHECK (seleccion_maxima >= 1 AND seleccion_minima <= seleccion_maxima)');
        RowLevelSecurity::enable('modificador_grupos');

        Schema::create('modificadores', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('modificador_grupo_id', 'modificador_grupos');
            $table->string('nombre', 60);
            $table->decimal('precio_adicional', 12, 2)->default(0);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo();

            $table->unique(['modificador_grupo_id', 'nombre']);
        });
        DB::statement('ALTER TABLE modificadores ADD CONSTRAINT modificadores_precio_check CHECK (precio_adicional >= 0)');
        RowLevelSecurity::enable('modificadores');

        Schema::create('producto_modificador_grupo', function (Blueprint $table) {
            $table->unsignedBigInteger('inquilino_id');
            $table->perteneceA('producto_id', 'productos');
            $table->perteneceA('modificador_grupo_id', 'modificador_grupos');
            $table->unsignedSmallInteger('orden')->default(0);

            $table->primary(['producto_id', 'modificador_grupo_id']);
            $table->foreign('inquilino_id')->references('id')->on('inquilinos')->restrictOnDelete();
        });
        RowLevelSecurity::enable('producto_modificador_grupo');
    }

    public function down(): void
    {
        foreach (['producto_modificador_grupo', 'modificadores', 'modificador_grupos', 'producto_estacion', 'categoria_estacion', 'estaciones_preparacion'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
