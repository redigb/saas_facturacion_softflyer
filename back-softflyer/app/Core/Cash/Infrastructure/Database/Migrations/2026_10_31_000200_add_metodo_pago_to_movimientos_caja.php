<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 038: los gastos de caja pueden pagarse en efectivo o con un método digital (Yape, Plin…).
// Nulo equivale a efectivo para los movimientos históricos.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos_caja', function (Blueprint $table) {
            $table->unsignedSmallInteger('metodo_pago_id')->nullable()->after('categoria');
            $table->foreign('metodo_pago_id')->references('id')->on('metodos_pago')->nullOnDelete();
            $table->index('metodo_pago_id');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_caja', function (Blueprint $table) {
            $table->dropForeign(['metodo_pago_id']);
            $table->dropColumn('metodo_pago_id');
        });
    }
};
