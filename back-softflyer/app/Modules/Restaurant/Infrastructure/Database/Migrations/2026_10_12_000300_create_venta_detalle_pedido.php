<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Doc. 08 §9 y §13 (spec 009): qué platos del pedido cubrió cada venta. Vive en el módulo
// para que `ventas` (Core) no conozca los pedidos.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta_detalle_pedido', function (Blueprint $table) {
            $table->unsignedBigInteger('inquilino_id');
            $table->perteneceA('venta_id', 'ventas');
            $table->perteneceA('detalle_pedido_id', 'detalle_pedidos');

            $table->primary(['venta_id', 'detalle_pedido_id']);
            // Un plato se cobra una sola vez, aunque dos cajeros lo intenten a la vez.
            $table->unique('detalle_pedido_id');
            $table->foreign('inquilino_id')->references('id')->on('inquilinos')->restrictOnDelete();
        });
        RowLevelSecurity::enable('venta_detalle_pedido');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('venta_detalle_pedido');
        Schema::dropIfExists('venta_detalle_pedido');
    }
};
