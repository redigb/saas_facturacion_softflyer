<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 017b: el envío se reintenta solo. `motivo_espera` dice por qué un comprobante pendiente espera
// y `registrado_en` cuándo SUNAT confirmó tenerlo (para limitar la consulta del CDR). Dos estados finales
// nuevos: SIN_CDR (SUNAT lo registró pero no entregó el CDR) y VENCIDO (no se pudo informar a tiempo).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->string('motivo_espera', 20)->nullable();
            $table->timestampTz('registrado_en')->nullable();
            $table->index(['estado', 'proximo_intento_en']);
        });
        DB::statement('ALTER TABLE comprobantes DROP CONSTRAINT comprobantes_estado_check');
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_estado_check CHECK (estado IN ('EMITIDO', 'ANULADO', 'PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'SIN_CDR', 'VENCIDO'))");
    }

    public function down(): void
    {
        DB::statement("UPDATE comprobantes SET estado = 'PENDIENTE_ENVIO' WHERE estado IN ('SIN_CDR', 'VENCIDO')");
        DB::statement('ALTER TABLE comprobantes DROP CONSTRAINT comprobantes_estado_check');
        DB::statement("ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_estado_check CHECK (estado IN ('EMITIDO', 'ANULADO', 'PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO'))");
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropIndex(['estado', 'proximo_intento_en']);
            $table->dropColumn(['motivo_espera', 'registrado_en']);
        });
    }
};
