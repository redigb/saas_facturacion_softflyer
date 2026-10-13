<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 010: comprobante emitido por cada venta. Hoy simulado (`es_simulado`); con Greenter
// se agregan XML, hash y estado SUNAT sin tocar lo que ya consume la pantalla.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comprobantes', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('empresa_id', 'empresas');
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->perteneceA('venta_id', 'ventas');
            $table->foreignId('tipo_comprobante_id')->constrained('tipos_comprobante')->restrictOnDelete();
            $table->char('serie', 4);
            $table->unsignedBigInteger('correlativo');
            $table->string('cliente_tipo_documento', 1)->default('-'); // catálogo SUNAT 06: '-', '1' DNI, '6' RUC
            $table->string('cliente_numero_documento', 15)->nullable();
            $table->string('cliente_nombre', 200)->default('CLIENTES VARIOS');
            $table->decimal('op_gravada', 12, 2);
            $table->decimal('igv', 12, 2);
            $table->decimal('total', 12, 2);
            $table->string('estado', 10)->default('EMITIDO');
            $table->boolean('es_simulado')->default(true);
            $table->timestampTz('emitido_en');
            $table->marcasDeTiempo();

            $table->unique('venta_id');
            // Nunca dos comprobantes con el mismo número, aunque dos cajeros cobren a la vez.
            $table->unique(['empresa_id', 'tipo_comprobante_id', 'serie', 'correlativo']);
            $table->index(['sucursal_id', 'emitido_en']);
        });
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_estado_check CHECK (estado IN ('EMITIDO', 'ANULADO'))");
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_cliente_check CHECK (cliente_tipo_documento IN ('-', '1', '6'))");
        RowLevelSecurity::enable('comprobantes');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('comprobantes');
        Schema::dropIfExists('comprobantes');
    }
};
