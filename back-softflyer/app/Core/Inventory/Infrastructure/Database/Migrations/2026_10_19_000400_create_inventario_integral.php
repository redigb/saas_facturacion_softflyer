<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 014: almacenes, existencias derivadas y kardex inmutable para restaurantes.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_tipo_check');
        DB::statement("ALTER TABLE productos ADD CONSTRAINT productos_tipo_check CHECK (tipo IN ('PLATO', 'BEBIDA', 'INSUMO', 'OBJETO'))");

        if (! Schema::hasColumn('productos', 'categoria_inventario')) {
            Schema::table('productos', function (Blueprint $table) {
                $table->string('categoria_inventario', 20)->nullable();
                $table->string('naturaleza_inventario', 12)->nullable();
            });
        }
        // Compatibilidad con cartas existentes que ya marcaban bebidas/platos como controlables.
        DB::table('inquilinos')->orderBy('id')->pluck('id')->each(function (int $tenantId): void {
            DB::statement("SELECT set_config('app.inquilino_actual', ?, false)", [(string) $tenantId]);
            DB::table('productos')->where('controla_stock', true)->whereNull('categoria_inventario')->update([
                'categoria_inventario' => DB::raw("CASE WHEN tipo = 'BEBIDA' THEN 'BEBIDA' ELSE 'ALIMENTO' END"),
                'naturaleza_inventario' => 'CONSUMIBLE',
            ]);
        });
        DB::statement("SELECT set_config('app.inquilino_actual', '', false)");
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_categoria_inventario_check');
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_naturaleza_inventario_check');
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_inventario_completo_check');
        DB::statement("ALTER TABLE productos ADD CONSTRAINT productos_categoria_inventario_check CHECK (categoria_inventario IS NULL OR categoria_inventario IN ('ALIMENTO', 'BEBIDA', 'LIMPIEZA', 'EMPAQUE', 'UTENSILIO', 'EQUIPO', 'OTRO'))");
        DB::statement("ALTER TABLE productos ADD CONSTRAINT productos_naturaleza_inventario_check CHECK (naturaleza_inventario IS NULL OR naturaleza_inventario IN ('CONSUMIBLE', 'REUTILIZABLE'))");
        DB::statement('ALTER TABLE productos ADD CONSTRAINT productos_inventario_completo_check CHECK (NOT controla_stock OR (categoria_inventario IS NOT NULL AND naturaleza_inventario IS NOT NULL))');

        Schema::create('almacenes', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->perteneceA('estacion_preparacion_id', 'estaciones_preparacion', nullable: true);
            $table->string('nombre', 80);
            $table->boolean('es_principal')->default(false);
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo();
        });
        DB::statement('CREATE UNIQUE INDEX almacenes_sucursal_estacion_unico ON almacenes (sucursal_id, estacion_preparacion_id) NULLS NOT DISTINCT');
        RowLevelSecurity::enable('almacenes');

        Schema::create('existencias', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('almacen_id', 'almacenes');
            $table->perteneceA('producto_id', 'productos');
            $table->decimal('cantidad', 14, 4)->default(0);
            $table->decimal('stock_minimo', 14, 4)->default(0);
            $table->decimal('cantidad_disponible', 14, 4)->default(0);
            $table->decimal('cantidad_danada', 14, 4)->default(0);
            $table->decimal('cantidad_perdida', 14, 4)->default(0);
            $table->marcasDeTiempo();

            $table->unique(['almacen_id', 'producto_id']);
        });
        DB::statement('ALTER TABLE existencias ADD CONSTRAINT existencias_cantidades_check CHECK (cantidad >= 0 AND stock_minimo >= 0 AND cantidad_disponible >= 0 AND cantidad_danada >= 0 AND cantidad_perdida >= 0)');
        RowLevelSecurity::enable('existencias');

        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('almacen_id', 'almacenes');
            $table->perteneceA('producto_id', 'productos');
            $table->string('tipo', 10);
            $table->string('sentido', 7);
            $table->decimal('cantidad', 14, 4);
            $table->decimal('saldo_anterior', 14, 4);
            $table->decimal('saldo_resultante', 14, 4);
            $table->string('motivo', 255);
            $table->jsonb('estado_anterior')->nullable();
            $table->jsonb('estado_resultante')->nullable();
            $table->perteneceA('usuario_id', 'usuarios');
            $table->timestampTz('creado_en')->useCurrent();

            $table->index(['inquilino_id', 'creado_en']);
            $table->index(['producto_id', 'almacen_id', 'id']);
        });
        DB::statement("ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_tipo_check CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'MERMA'))");
        DB::statement("ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_sentido_check CHECK (sentido IN ('ENTRADA', 'SALIDA'))");
        DB::statement("ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_cantidad_check CHECK (cantidad >= 0 AND (cantidad > 0 OR tipo = 'AJUSTE') AND saldo_anterior >= 0 AND saldo_resultante >= 0)");
        RowLevelSecurity::enable('movimientos_inventario');

        DB::table('permisos')->updateOrInsert(
            ['codigo' => 'inventario.administrar'],
            ['modulo' => 'inventario', 'descripcion' => 'Administrar artículos y almacenes'],
        );

        $permissionIds = DB::table('permisos')->whereIn('codigo', ['inventario.ver', 'inventario.ajustar', 'inventario.administrar'])->pluck('id', 'codigo');
        DB::table('inquilinos')->orderBy('id')->pluck('id')->each(function (int $tenantId) use ($permissionIds): void {
            DB::statement("SELECT set_config('app.inquilino_actual', ?, false)", [(string) $tenantId]);
            $roles = DB::table('roles')->whereIn('nombre', ['Administrador', 'Cocinero'])->get(['id', 'nombre']);
            foreach ($roles as $role) {
                $codes = $role->nombre === 'Administrador'
                    ? ['inventario.ver', 'inventario.ajustar', 'inventario.administrar']
                    : ['inventario.ver', 'inventario.ajustar'];
                foreach ($codes as $code) {
                    if (isset($permissionIds[$code])) {
                        DB::table('permiso_rol')->insertOrIgnore([
                            'inquilino_id' => $tenantId,
                            'rol_id' => $role->id,
                            'permiso_id' => $permissionIds[$code],
                        ]);
                    }
                }
            }
        });
        DB::statement("SELECT set_config('app.inquilino_actual', '', false)");
    }

    public function down(): void
    {
        foreach (['movimientos_inventario', 'existencias', 'almacenes'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }

        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_categoria_inventario_check');
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_naturaleza_inventario_check');
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_inventario_completo_check');
        DB::table('inquilinos')->orderBy('id')->pluck('id')->each(function (int $tenantId): void {
            DB::statement("SELECT set_config('app.inquilino_actual', ?, false)", [(string) $tenantId]);
            DB::table('productos')->where('tipo', 'OBJETO')->update(['tipo' => 'INSUMO']);
        });
        DB::statement("SELECT set_config('app.inquilino_actual', '', false)");
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn(['categoria_inventario', 'naturaleza_inventario']);
        });
        DB::statement('ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_tipo_check');
        DB::statement("ALTER TABLE productos ADD CONSTRAINT productos_tipo_check CHECK (tipo IN ('PLATO', 'BEBIDA', 'INSUMO'))");

        $permissionId = DB::table('permisos')->where('codigo', 'inventario.administrar')->value('id');
        if ($permissionId) {
            DB::table('permiso_rol')->where('permiso_id', $permissionId)->delete();
            DB::table('permisos')->where('id', $permissionId)->delete();
        }
    }
};
