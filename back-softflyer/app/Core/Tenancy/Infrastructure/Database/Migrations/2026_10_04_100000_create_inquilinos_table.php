<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sin RLS: es la unica tabla que se consulta antes de conocer al inquilino (Doc. 06 §1.1).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquilinos', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 63)->unique();
            $table->string('nombre');
            $table->string('estado', 20)->default('PRUEBA');
            $table->boolean('es_demo')->default(false);
            $table->timestampTz('creado_en')->nullable();
            $table->timestampTz('actualizado_en')->nullable();
        });

        DB::statement("ALTER TABLE inquilinos ADD CONSTRAINT inquilinos_estado_check CHECK (estado IN ('PRUEBA', 'ACTIVO', 'MOROSO', 'SUSPENDIDO', 'CANCELADO'))");
        DB::statement("ALTER TABLE inquilinos ADD CONSTRAINT inquilinos_slug_check CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('inquilinos');
    }
};
