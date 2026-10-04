<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Empresas (RUC) y sucursales (puntos de emision) del inquilino (Doc. 08 §11.2).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->char('ruc', 11)->nullable();
            $table->string('razon_social')->nullable();
            $table->string('nombre_comercial');
            $table->string('direccion_fiscal')->nullable();
            $table->foreignId('ubigeo_id')->nullable()->constrained('ubigeos')->restrictOnDelete();
            $table->string('usuario_sol', 30)->nullable();
            $table->text('clave_sol_cifrada')->nullable();
            $table->boolean('homologado')->default(false);
            $table->boolean('aplica_tasa_reducida')->default(false);
            $table->marcasDeTiempo(softDeletes: true);

            $table->unique(['inquilino_id', 'ruc']);
        });
        DB::statement("ALTER TABLE empresas ADD CONSTRAINT empresas_ruc_check CHECK (ruc ~ '^(10|15|17|20)[0-9]{9}$')");
        RowLevelSecurity::enable('empresas');

        Schema::create('sucursales', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('empresa_id', 'empresas');
            $table->string('nombre');
            $table->string('direccion')->nullable();
            $table->foreignId('ubigeo_id')->nullable()->constrained('ubigeos')->restrictOnDelete();
            $table->char('codigo_establecimiento', 4)->default('0000');
            $table->boolean('es_principal')->default(false);
            $table->boolean('es_activa')->default(true);
            $table->marcasDeTiempo(softDeletes: true);
        });
        DB::statement("ALTER TABLE sucursales ADD CONSTRAINT sucursales_codigo_establecimiento_check CHECK (codigo_establecimiento ~ '^[0-9]{4}$')");
        DB::statement('CREATE UNIQUE INDEX sucursales_una_principal ON sucursales (inquilino_id) WHERE es_principal AND eliminado_en IS NULL');
        RowLevelSecurity::enable('sucursales');
    }

    public function down(): void
    {
        foreach (['sucursales', 'empresas'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
    }
};
