<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 029: distingue una comanda inicial de un agregado posterior del mismo pedido.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comandas', function (Blueprint $table) {
            $table->boolean('es_agregado')->default(false);
        });

        // Las tandas 2+ existentes son agregados inequívocos. Una tanda 1 puede
        // pertenecer a una estación incorporada después, algo que antes no se guardaba.
        DB::table('comandas')->where('numero', '>', 1)->update(['es_agregado' => true]);
    }

    public function down(): void
    {
        Schema::table('comandas', function (Blueprint $table) {
            $table->dropColumn('es_agregado');
        });
    }
};
