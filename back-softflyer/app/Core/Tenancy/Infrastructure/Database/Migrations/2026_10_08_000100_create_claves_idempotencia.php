<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Reintentos seguros en escrituras criticas (Doc. 07 §5, Doc. 08 §12, spec 001).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claves_idempotencia', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->uuid('clave');
            $table->string('endpoint');             // "POST /api/v1/pedidos/15/comandas"
            $table->char('hash_solicitud', 64);     // sha256 del cuerpo: detecta la clave reutilizada en otra operacion
            $table->unsignedSmallInteger('codigo_http')->nullable(); // Nulo = la operacion sigue en curso
            $table->jsonb('respuesta_guardada')->nullable();
            $table->timestampTz('creado_en')->useCurrent();

            // La base garantiza que dos requests simultaneas no ejecuten la operacion dos veces.
            $table->unique(['inquilino_id', 'endpoint', 'clave']);
            $table->index('creado_en');
        });
        RowLevelSecurity::enable('claves_idempotencia');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('claves_idempotencia');
        Schema::dropIfExists('claves_idempotencia');
    }
};
