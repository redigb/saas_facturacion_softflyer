<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spec 039: el pedido congela el descuento aplicado (la promo puede cambiar o borrarse después).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_pedidos', function (Blueprint $table) {
            $table->decimal('descuento', 12, 2)->default(0)->after('precio_unitario');
            $table->string('promocion_nombre', 80)->nullable()->after('descuento');
        });
    }

    public function down(): void
    {
        Schema::table('detalle_pedidos', function (Blueprint $table) {
            $table->dropColumn(['descuento', 'promocion_nombre']);
        });
    }
};
