<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Roles por inquilino y catalogo global de permisos (Doc. 06 §5, Doc. 08 §4).
// Las plantillas de rol viven en config/softflyer.php y se copian al dar de alta un inquilino.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->string('pin_hash')->nullable();
            $table->unique(['inquilino_id', 'id']);
        });

        Schema::create('permisos', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('codigo', 60)->unique();
            $table->string('modulo', 30);
            $table->string('descripcion');
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->string('nombre', 60);
            $table->string('descripcion')->nullable();
            $table->boolean('es_sistema')->default(false);
            $table->marcasDeTiempo();

            $table->unique(['inquilino_id', 'nombre']);
        });
        RowLevelSecurity::enable('roles');

        Schema::create('permiso_rol', function (Blueprint $table) {
            $table->unsignedBigInteger('inquilino_id');
            $table->perteneceA('rol_id', 'roles');
            $table->foreignId('permiso_id')->constrained('permisos')->restrictOnDelete();

            $table->primary(['rol_id', 'permiso_id']);
            $table->foreign('inquilino_id')->references('id')->on('inquilinos')->restrictOnDelete();
        });
        RowLevelSecurity::enable('permiso_rol');

        Schema::create('rol_usuario', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('usuario_id', 'usuarios');
            $table->perteneceA('rol_id', 'roles');
            $table->perteneceA('sucursal_id', 'sucursales', nullable: true);
            $table->marcasDeTiempo();
        });
        // sucursal_id nulo = todas las sucursales; NULLS NOT DISTINCT evita repetir ese rol global.
        DB::statement('CREATE UNIQUE INDEX rol_usuario_unico ON rol_usuario (usuario_id, rol_id, sucursal_id) NULLS NOT DISTINCT');
        RowLevelSecurity::enable('rol_usuario');
    }

    public function down(): void
    {
        foreach (['rol_usuario', 'permiso_rol', 'roles'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }
        Schema::dropIfExists('permisos');

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropUnique(['inquilino_id', 'id']);
            $table->dropColumn('pin_hash');
        });
    }
};
