<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquilino_id')->constrained('inquilinos')->restrictOnDelete();
            $table->string('nombre');
            $table->string('correo');
            $table->string('contrasena');
            $table->boolean('es_activo')->default(true);
            $table->timestampTz('creado_en')->nullable();
            $table->timestampTz('actualizado_en')->nullable();
            $table->softDeletesTz('eliminado_en');

            $table->unique(['inquilino_id', 'correo']);
        });

        RowLevelSecurity::enable('usuarios');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('usuarios');
        Schema::dropIfExists('usuarios');
    }
};
