<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 035: enlaces de un solo uso para restablecer la contrasena (Doc. 06 §3).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restablecimientos_contrasena', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('usuario_id', 'usuarios');
            // Solo el hash: el token viaja en el enlace y nunca se guarda.
            $table->string('token_hash', 64)->unique();
            $table->string('origen', 12);
            $table->timestampTz('expira_en');
            $table->timestampTz('usado_en')->nullable();
            $table->marcasDeTiempo();

            $table->index(['usuario_id', 'usado_en']);
        });
        DB::statement("ALTER TABLE restablecimientos_contrasena ADD CONSTRAINT restablecimientos_origen_check CHECK (origen IN ('USUARIO', 'PLATAFORMA'))");
        RowLevelSecurity::enable('restablecimientos_contrasena');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('restablecimientos_contrasena');
        Schema::dropIfExists('restablecimientos_contrasena');
    }
};
