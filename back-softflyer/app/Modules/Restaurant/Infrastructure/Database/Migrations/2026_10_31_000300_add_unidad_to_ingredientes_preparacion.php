<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 038: unidad de medida del ingrediente (ONZ, ml, gr, kg), separada de la cantidad.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ingredientes_preparacion', function (Blueprint $table) {
            $table->string('unidad', 8)->nullable()->after('cantidad');
        });
    }

    public function down(): void
    {
        Schema::table('ingredientes_preparacion', function (Blueprint $table) {
            $table->dropColumn('unidad');
        });
    }
};
