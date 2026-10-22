<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 031: instrucciones operativas visibles en Cocina y Barra.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fichas_preparacion', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('producto_id', 'productos');
            $table->text('procedimiento')->nullable();
            $table->text('notas')->nullable();
            $table->perteneceA('actualizado_por', 'usuarios', nullable: true);
            $table->marcasDeTiempo();

            $table->unique('producto_id');
        });
        RowLevelSecurity::enable('fichas_preparacion');

        Schema::create('ingredientes_preparacion', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('ficha_preparacion_id', 'fichas_preparacion');
            $table->string('nombre', 120);
            $table->string('cantidad', 60)->nullable();
            $table->unsignedSmallInteger('orden')->default(0);

            $table->unique(['ficha_preparacion_id', 'orden']);
        });
        RowLevelSecurity::enable('ingredientes_preparacion');
    }

    public function down(): void
    {
        foreach (['ingredientes_preparacion', 'fichas_preparacion'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
