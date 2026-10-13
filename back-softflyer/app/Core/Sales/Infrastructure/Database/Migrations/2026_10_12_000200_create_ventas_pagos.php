<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Lote 7 del Doc. 08 §9 (spec 009): ventas, su detalle y pagos.
// `clientes` y los montos exonerados/inafectos llegan con la facturación (H3).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->perteneceA('sesion_caja_id', 'sesiones_caja');
            $table->perteneceA('usuario_id', 'usuarios'); // quien cobró
            $table->decimal('op_gravada', 12, 2);
            $table->decimal('op_exonerada', 12, 2)->default(0);
            $table->decimal('op_inafecta', 12, 2)->default(0);
            $table->decimal('igv', 12, 2);
            $table->decimal('total', 12, 2);
            $table->decimal('monto_propina', 12, 2)->default(0);
            $table->string('estado', 10)->default('EMITIDA');
            $table->marcasDeTiempo();

            $table->index(['sesion_caja_id']);
            $table->index(['sucursal_id', 'creado_en']);
        });
        DB::statement('ALTER TABLE ventas ADD CONSTRAINT ventas_total_check CHECK (total = op_gravada + op_exonerada + op_inafecta + igv)');
        DB::statement("ALTER TABLE ventas ADD CONSTRAINT ventas_estado_check CHECK (estado IN ('EMITIDA', 'ANULADA'))");
        RowLevelSecurity::enable('ventas');

        Schema::create('detalle_ventas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('venta_id', 'ventas');
            $table->perteneceA('producto_id', 'productos');
            $table->string('descripcion', 200);          // copia: cambiar la carta no altera lo vendido
            $table->decimal('cantidad', 10, 3);
            $table->decimal('precio_unitario', 12, 2);   // con IGV y modificadores
            $table->decimal('descuento', 12, 2)->default(0);
            $table->decimal('igv', 12, 2);
            $table->decimal('total', 12, 2);

            $table->index(['venta_id']);
        });
        RowLevelSecurity::enable('detalle_ventas');

        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('venta_id', 'ventas');
            $table->perteneceA('sesion_caja_id', 'sesiones_caja');
            $table->unsignedSmallInteger('metodo_pago_id');
            $table->decimal('monto', 12, 2);                       // lo que se aplica a la venta
            $table->decimal('monto_recibido', 12, 2)->nullable();  // solo efectivo
            $table->decimal('vuelto', 12, 2)->default(0);
            $table->string('referencia', 60)->nullable();
            $table->marcasDeTiempo();

            $table->foreign('metodo_pago_id')->references('id')->on('metodos_pago')->restrictOnDelete();
            $table->index(['sesion_caja_id']);
        });
        DB::statement('ALTER TABLE pagos ADD CONSTRAINT pagos_monto_check CHECK (monto > 0)');
        DB::statement('ALTER TABLE pagos ADD CONSTRAINT pagos_vuelto_check CHECK (vuelto = COALESCE(monto_recibido, monto) - monto)');
        RowLevelSecurity::enable('pagos');
    }

    public function down(): void
    {
        foreach (['pagos', 'detalle_ventas', 'ventas'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
