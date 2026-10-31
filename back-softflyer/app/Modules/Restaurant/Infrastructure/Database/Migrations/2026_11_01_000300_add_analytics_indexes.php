<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 039: consultas de analíticas por rango de fechas y por plato.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->index('producto_id');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->index(['estado', 'creado_en']);
        });
    }

    public function down(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->dropIndex(['producto_id']);
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex(['estado', 'creado_en']);
        });
    }
};
