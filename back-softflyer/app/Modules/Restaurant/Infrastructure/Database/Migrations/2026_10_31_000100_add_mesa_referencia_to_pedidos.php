<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 038: un "para llevar" puede pertenecer a una mesa para cobrarse en la misma boleta.
// No ocupa la mesa: sigue sin fila en pedido_mesa y sin cambiar el estado de la mesa.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->perteneceA('mesa_referencia_id', 'mesas', nullable: true);
            $table->index('mesa_referencia_id');
        });

        DB::statement('ALTER TABLE pedidos ADD CONSTRAINT pedidos_mesa_referencia_check CHECK (mesa_referencia_id IS NULL OR tipo = \'PARA_LLEVAR\')');
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['mesa_referencia_id']);
            $table->dropColumn('mesa_referencia_id');
        });
    }
};
