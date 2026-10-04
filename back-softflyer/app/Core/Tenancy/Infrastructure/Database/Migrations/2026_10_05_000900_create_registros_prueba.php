<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Solicitudes de prueba gratis. Global y sin RLS: existen antes que el inquilino.
// Tambien es la lista de interesados para ventas.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_prueba', function (Blueprint $table) {
            $table->id();
            $table->char('ruc', 11);
            $table->string('razon_social');
            $table->string('nombre_comercial');
            $table->string('slug', 63);
            $table->string('nombre_contacto');
            $table->string('correo');
            $table->string('telefono', 15)->nullable();
            $table->string('contrasena_hash')->nullable(); // Se borra al crear la cuenta.
            $table->char('token_hash', 64)->nullable();     // sha256 del enlace; nunca el token en claro.
            $table->timestampTz('token_expira_en')->nullable();
            $table->timestampTz('verificado_en')->nullable();
            $table->foreignId('inquilino_id')->nullable()->constrained('inquilinos')->nullOnDelete();
            $table->ipAddress('ip')->nullable();
            $table->timestampTz('creado_en')->nullable();
            $table->timestampTz('actualizado_en')->nullable();

            $table->index('token_hash');
            $table->index('correo');
        });

        // Un RUC usa la prueba gratis una sola vez.
        DB::statement('CREATE UNIQUE INDEX registros_prueba_ruc_verificado ON registros_prueba (ruc) WHERE verificado_en IS NOT NULL');
        DB::statement("ALTER TABLE registros_prueba ADD CONSTRAINT registros_prueba_ruc_check CHECK (ruc ~ '^(10|15|17|20)[0-9]{9}$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_prueba');
    }
};
