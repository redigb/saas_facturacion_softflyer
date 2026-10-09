<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Lote 6 del Doc. 08 §13 (spec 006): pedidos, mesas del pedido, comandas y sus detalles.
// `clientes` y `pedidos.cliente_id` llegan con el cobro (H2).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->unsignedInteger('numero');          // correlativo diario por sucursal: "pedido 42"
            $table->date('fecha_operacion');
            $table->string('tipo', 12);
            $table->perteneceA('mesa_id', 'mesas', nullable: true);
            $table->perteneceA('mozo_id', 'usuarios');
            $table->unsignedSmallInteger('numero_comensales')->nullable();
            $table->string('estado', 12)->default('ABIERTO');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('abierto_en');
            $table->timestampTz('cerrado_en')->nullable();
            $table->marcasDeTiempo();

            $table->unique(['sucursal_id', 'fecha_operacion', 'numero']);
            $table->index(['sucursal_id', 'estado']);
        });
        DB::statement("ALTER TABLE pedidos ADD CONSTRAINT pedidos_tipo_check CHECK (tipo IN ('SALON', 'PARA_LLEVAR'))");
        DB::statement("ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check CHECK (estado IN ('ABIERTO', 'POR_COBRAR', 'CERRADO', 'ANULADO'))");
        // Un pedido de salón siempre tiene mesa y uno para llevar nunca (Doc. 08 §8).
        DB::statement("ALTER TABLE pedidos ADD CONSTRAINT pedidos_mesa_check CHECK ((tipo = 'SALON') = (mesa_id IS NOT NULL))");
        RowLevelSecurity::enable('pedidos');

        Schema::create('pedido_mesa', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('pedido_id', 'pedidos');
            $table->perteneceA('mesa_id', 'mesas');
            $table->timestampTz('unida_en');
            $table->timestampTz('liberada_en')->nullable();
        });
        // Una mesa no puede estar en dos pedidos activos, aunque dos mozos la toquen en el mismo segundo.
        DB::statement('CREATE UNIQUE INDEX pedido_mesa_mesa_activa ON pedido_mesa (mesa_id) WHERE liberada_en IS NULL');
        RowLevelSecurity::enable('pedido_mesa');

        Schema::create('comandas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('pedido_id', 'pedidos');
            // Nulo = comanda "general" de un restaurante sin estaciones (spec 006).
            $table->perteneceA('estacion_preparacion_id', 'estaciones_preparacion', nullable: true);
            $table->unsignedSmallInteger('numero');
            $table->perteneceA('enviada_por', 'usuarios');
            $table->timestampTz('enviada_en');
            $table->timestampTz('impresa_en')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX comandas_numero_unico ON comandas (pedido_id, estacion_preparacion_id, numero) NULLS NOT DISTINCT');
        RowLevelSecurity::enable('comandas');

        Schema::create('detalle_pedidos', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('pedido_id', 'pedidos');
            $table->perteneceA('comanda_id', 'comandas', nullable: true);
            $table->perteneceA('producto_id', 'productos');
            $table->decimal('cantidad', 10, 3);
            $table->decimal('precio_unitario', 12, 2);   // copia: cambiar la carta no altera lo ya pedido
            $table->string('notas', 200)->nullable();
            $table->string('estado_cocina', 15)->default('PENDIENTE');
            $table->timestampTz('anulado_en')->nullable();
            $table->perteneceA('anulado_por', 'usuarios', nullable: true);
            $table->string('motivo_anulacion', 200)->nullable();
            $table->marcasDeTiempo();

            $table->index(['pedido_id']);
            $table->index(['comanda_id']);
        });
        DB::statement('ALTER TABLE detalle_pedidos ADD CONSTRAINT detalle_pedidos_cantidad_check CHECK (cantidad > 0)');
        DB::statement('ALTER TABLE detalle_pedidos ADD CONSTRAINT detalle_pedidos_precio_check CHECK (precio_unitario >= 0)');
        DB::statement("ALTER TABLE detalle_pedidos ADD CONSTRAINT detalle_pedidos_estado_check CHECK (estado_cocina IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'))");
        // Un plato anulado siempre dice cuándo, quién y por qué.
        DB::statement('ALTER TABLE detalle_pedidos ADD CONSTRAINT detalle_pedidos_anulacion_check CHECK ((anulado_en IS NULL) = (anulado_por IS NULL) AND (anulado_en IS NULL) = (motivo_anulacion IS NULL))');
        RowLevelSecurity::enable('detalle_pedidos');

        Schema::create('detalle_pedido_modificador', function (Blueprint $table) {
            $table->unsignedBigInteger('inquilino_id');
            $table->perteneceA('detalle_pedido_id', 'detalle_pedidos');
            $table->perteneceA('modificador_id', 'modificadores');
            $table->decimal('precio_adicional', 12, 2);  // copia congelada

            $table->primary(['detalle_pedido_id', 'modificador_id']);
            $table->foreign('inquilino_id')->references('id')->on('inquilinos')->restrictOnDelete();
        });
        RowLevelSecurity::enable('detalle_pedido_modificador');
    }

    public function down(): void
    {
        foreach (['detalle_pedido_modificador', 'detalle_pedidos', 'comandas', 'pedido_mesa', 'pedidos'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
