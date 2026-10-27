<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Spec 036: el alta directa envia un enlace de activacion en vez de una contrasena temporal.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE restablecimientos_contrasena DROP CONSTRAINT restablecimientos_origen_check');
        DB::statement("ALTER TABLE restablecimientos_contrasena ADD CONSTRAINT restablecimientos_origen_check CHECK (origen IN ('USUARIO', 'PLATAFORMA', 'ACTIVACION'))");
    }

    public function down(): void
    {
        DB::statement("DELETE FROM restablecimientos_contrasena WHERE origen = 'ACTIVACION'");
        DB::statement('ALTER TABLE restablecimientos_contrasena DROP CONSTRAINT restablecimientos_origen_check');
        DB::statement("ALTER TABLE restablecimientos_contrasena ADD CONSTRAINT restablecimientos_origen_check CHECK (origen IN ('USUARIO', 'PLATAFORMA'))");
    }
};
