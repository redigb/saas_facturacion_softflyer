<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Catalogos globales (Doc. 08 §11.1): sin inquilino_id ni RLS, se cargan por seeder.
return new class extends Migration
{
    private const CODE_CATALOGS = [
        'tipos_documento_identidad' => 1,
        'tipos_comprobante' => 2,
        'monedas' => 3,
        'unidades_medida' => 3,
        'tipos_afectacion_igv' => 2,
        'motivos_nota_credito' => 2,
        'motivos_nota_debito' => 2,
    ];

    public function up(): void
    {
        foreach (self::CODE_CATALOGS as $table => $length) {
            Schema::create($table, function (Blueprint $table) use ($length) {
                $table->smallIncrements('id');
                $table->string('codigo', $length)->unique();
                $table->string('nombre', 120);
                $table->boolean('es_activo')->default(true);
            });
        }

        Schema::table('monedas', function (Blueprint $table) {
            $table->string('simbolo', 5);
        });

        Schema::create('tasas_igv', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('codigo', 20);
            $table->string('nombre', 120);
            $table->decimal('tasa', 5, 2);
            $table->date('vigente_desde');
            $table->date('vigente_hasta')->nullable();
            $table->unique(['codigo', 'vigente_desde']);
        });

        Schema::create('ubigeos', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->char('codigo', 6)->unique();
            $table->string('departamento', 60);
            $table->string('provincia', 60);
            $table->string('distrito', 60);
        });

        Schema::create('metodos_pago', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 60);
            $table->boolean('es_efectivo')->default(false);
            $table->boolean('es_activo')->default(true);
        });
    }

    public function down(): void
    {
        foreach (['metodos_pago', 'ubigeos', 'tasas_igv', ...array_keys(self::CODE_CATALOGS)] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
