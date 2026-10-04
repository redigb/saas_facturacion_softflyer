<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Certificado de firma y series de comprobantes por empresa (Doc. 08 §11.2).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificados_digitales', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('empresa_id', 'empresas');
            $table->text('pem_cifrado');
            $table->string('formato_origen', 3);
            $table->date('vence_en');
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo();
        });
        DB::statement("ALTER TABLE certificados_digitales ADD CONSTRAINT certificados_formato_check CHECK (formato_origen IN ('PFX', 'PEM'))");
        DB::statement('CREATE UNIQUE INDEX certificados_uno_activo ON certificados_digitales (empresa_id) WHERE es_activo');
        RowLevelSecurity::enable('certificados_digitales');

        Schema::create('series_comprobante', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('empresa_id', 'empresas');
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->foreignId('tipo_comprobante_id')->constrained('tipos_comprobante')->restrictOnDelete();
            $table->char('serie', 4);
            $table->unsignedBigInteger('ultimo_correlativo')->default(0);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo();

            // SUNAT exige series unicas por RUC, no por sucursal.
            $table->unique(['empresa_id', 'tipo_comprobante_id', 'serie']);
        });
        DB::statement("ALTER TABLE series_comprobante ADD CONSTRAINT series_formato_check CHECK (serie ~ '^[BF][A-Z0-9]{3}$')");
        RowLevelSecurity::enable('series_comprobante');
    }

    public function down(): void
    {
        foreach (['series_comprobante', 'certificados_digitales'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
