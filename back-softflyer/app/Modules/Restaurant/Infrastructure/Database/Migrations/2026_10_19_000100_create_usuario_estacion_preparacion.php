<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 030: limita cada cuenta de cocina a sus estaciones KDS.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario_estacion_preparacion', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('usuario_id', 'usuarios');
            // Nulo representa la bandeja General de platos sin estación.
            $table->perteneceA('estacion_preparacion_id', 'estaciones_preparacion', nullable: true);
        });
        DB::statement('CREATE UNIQUE INDEX usuario_estacion_preparacion_unica ON usuario_estacion_preparacion (usuario_id, estacion_preparacion_id) NULLS NOT DISTINCT');
        RowLevelSecurity::enable('usuario_estacion_preparacion');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('usuario_estacion_preparacion');
        Schema::dropIfExists('usuario_estacion_preparacion');
    }
};
