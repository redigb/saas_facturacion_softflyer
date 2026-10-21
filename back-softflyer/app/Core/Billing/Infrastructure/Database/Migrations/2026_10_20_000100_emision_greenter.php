<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 017b: el comprobante pasa de simulación a documento real. Guarda el desglose por
// afectación, el rastro del envío a SUNAT (XML, CDR, intentos) y el detalle que se firma.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->unsignedSmallInteger('tipo_afectacion_igv_id')->nullable();
            $table->foreign('tipo_afectacion_igv_id')->references('id')->on('tipos_afectacion_igv')->restrictOnDelete();
        });

        Schema::table('comprobantes', function (Blueprint $table) {
            $table->decimal('op_exonerada', 12, 2)->default(0)->after('op_gravada');
            $table->decimal('op_inafecta', 12, 2)->default(0)->after('op_exonerada');
            $table->string('hash_firma', 60)->nullable();
            $table->unsignedSmallInteger('intentos_envio')->default(0);
            $table->text('ultimo_error_tecnico')->nullable();
            $table->string('ruta_xml')->nullable();
            $table->string('ruta_cdr')->nullable();
            $table->string('codigo_respuesta_sunat', 10)->nullable();
            $table->text('mensaje_respuesta_sunat')->nullable();
            $table->timestampTz('enviado_en')->nullable();
            $table->timestampTz('proximo_intento_en')->nullable();
        });
        DB::statement('ALTER TABLE comprobantes ALTER COLUMN estado TYPE varchar(20)');
        DB::statement('ALTER TABLE comprobantes DROP CONSTRAINT comprobantes_estado_check');
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_estado_check CHECK (estado IN ('EMITIDO', 'ANULADO', 'PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO'))");

        Schema::create('detalle_comprobantes', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('comprobante_id', 'comprobantes');
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();
            $table->string('descripcion', 200);
            $table->string('unidad_medida', 3)->default('NIU');
            $table->decimal('cantidad', 10, 3);
            $table->decimal('valor_unitario', 14, 6);   // sin IGV
            $table->decimal('precio_unitario', 14, 6);  // con IGV
            $table->unsignedSmallInteger('tipo_afectacion_igv_id');
            $table->decimal('valor_venta', 12, 2);      // base de la línea sin IGV
            $table->decimal('igv', 12, 2);
            $table->decimal('total', 12, 2);
            $table->marcasDeTiempo();

            $table->foreign('tipo_afectacion_igv_id')->references('id')->on('tipos_afectacion_igv')->restrictOnDelete();
            $table->index('comprobante_id');
        });
        RowLevelSecurity::enable('detalle_comprobantes');
    }

    public function down(): void
    {
        RowLevelSecurity::disable('detalle_comprobantes');
        Schema::dropIfExists('detalle_comprobantes');

        DB::statement('ALTER TABLE comprobantes DROP CONSTRAINT comprobantes_estado_check');
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_estado_check CHECK (estado IN ('EMITIDO', 'ANULADO'))");
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropColumn(['op_exonerada', 'op_inafecta', 'hash_firma', 'intentos_envio', 'ultimo_error_tecnico', 'ruta_xml', 'ruta_cdr', 'codigo_respuesta_sunat', 'mensaje_respuesta_sunat', 'enviado_en', 'proximo_intento_en']);
        });
        Schema::table('detalle_ventas', function (Blueprint $table) {
            $table->dropForeign(['tipo_afectacion_igv_id']);
            $table->dropColumn('tipo_afectacion_igv_id');
        });
    }
};
