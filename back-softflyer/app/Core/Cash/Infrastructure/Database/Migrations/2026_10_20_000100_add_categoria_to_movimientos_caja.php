<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 033: distingue gastos operativos, retiros e ingresos sin alterar el arqueo.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos_caja', function (Blueprint $table) {
            $table->string('categoria', 40)->nullable()->after('concepto');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_caja', function (Blueprint $table) {
            $table->dropColumn('categoria');
        });
    }
};
