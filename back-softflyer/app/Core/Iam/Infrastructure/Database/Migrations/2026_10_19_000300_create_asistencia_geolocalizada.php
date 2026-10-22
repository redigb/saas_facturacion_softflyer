<?php

use App\Core\Tenancy\Infrastructure\Database\RowLevelSecurity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Spec 032: asistencia con geocerca y hora autoritativa del servidor.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sucursales', function (Blueprint $table) {
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->unsignedSmallInteger('radio_geocerca_metros')->nullable();
        });
        DB::statement('ALTER TABLE sucursales ADD CONSTRAINT sucursales_geocerca_completa_check CHECK ((latitud IS NULL AND longitud IS NULL AND radio_geocerca_metros IS NULL) OR (latitud IS NOT NULL AND longitud IS NOT NULL AND radio_geocerca_metros BETWEEN 20 AND 500))');
        DB::statement('ALTER TABLE sucursales ADD CONSTRAINT sucursales_latitud_check CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90)');
        DB::statement('ALTER TABLE sucursales ADD CONSTRAINT sucursales_longitud_check CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)');

        Schema::create('horarios_trabajo', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('usuario_id', 'usuarios');
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->jsonb('dias_semana');
            $table->time('hora_entrada');
            $table->time('hora_salida');
            $table->unsignedSmallInteger('tolerancia_minutos')->default(5);
            $table->boolean('es_activo')->default(true);
            $table->marcasDeTiempo();

            $table->unique(['usuario_id', 'sucursal_id']);
        });
        DB::statement('ALTER TABLE horarios_trabajo ADD CONSTRAINT horarios_tolerancia_check CHECK (tolerancia_minutos <= 120)');
        RowLevelSecurity::enable('horarios_trabajo');

        Schema::create('marcaciones_asistencia', function (Blueprint $table) {
            $table->id();
            $table->inquilino();
            $table->perteneceA('usuario_id', 'usuarios');
            $table->perteneceA('sucursal_id', 'sucursales');
            $table->string('tipo', 10);
            $table->timestampTz('marcado_en');
            $table->decimal('latitud', 10, 7);
            $table->decimal('longitud', 10, 7);
            $table->decimal('precision_metros', 8, 2);
            $table->decimal('distancia_metros', 8, 2);
            $table->string('estado', 15);
            $table->marcasDeTiempo();

            $table->index(['usuario_id', 'sucursal_id', 'marcado_en']);
        });
        DB::statement("ALTER TABLE marcaciones_asistencia ADD CONSTRAINT marcaciones_tipo_check CHECK (tipo IN ('ENTRADA', 'SALIDA'))");
        DB::statement("ALTER TABLE marcaciones_asistencia ADD CONSTRAINT marcaciones_estado_check CHECK (estado IN ('PUNTUAL', 'TARDANZA', 'REGISTRADA'))");
        DB::statement('ALTER TABLE marcaciones_asistencia ADD CONSTRAINT marcaciones_precision_check CHECK (precision_metros >= 0 AND precision_metros <= 100)');
        DB::statement('ALTER TABLE marcaciones_asistencia ADD CONSTRAINT marcaciones_distancia_check CHECK (distancia_metros >= 0)');
        RowLevelSecurity::enable('marcaciones_asistencia');

        $permissions = [
            'asistencia.marcar' => 'Registrar la asistencia propia',
            'asistencia.administrar' => 'Configurar horarios y revisar la asistencia',
        ];
        foreach ($permissions as $code => $description) {
            DB::table('permisos')->updateOrInsert(
                ['codigo' => $code],
                ['modulo' => 'asistencia', 'descripcion' => $description],
            );
        }

        // Los restaurantes existentes reciben la nueva capacidad sin tener que recrear roles.
        $permissionIds = DB::table('permisos')->whereIn('codigo', array_keys($permissions))->pluck('id', 'codigo');
        DB::table('inquilinos')->orderBy('id')->pluck('id')->each(function (int $tenantId) use ($permissionIds): void {
            DB::statement("SELECT set_config('app.inquilino_actual', ?, false)", [(string) $tenantId]);
            $roles = DB::table('roles')->whereIn('nombre', ['Administrador', 'Cajero', 'Encargado de salón', 'Mozo', 'Cocinero'])->get(['id', 'nombre']);
            foreach ($roles as $role) {
                $codes = $role->nombre === 'Administrador' ? ['asistencia.marcar', 'asistencia.administrar'] : ['asistencia.marcar'];
                foreach ($codes as $code) {
                    DB::table('permiso_rol')->insertOrIgnore([
                        'inquilino_id' => $tenantId,
                        'rol_id' => $role->id,
                        'permiso_id' => $permissionIds[$code],
                    ]);
                }
            }
        });
        DB::statement("SELECT set_config('app.inquilino_actual', '', false)");
    }

    public function down(): void
    {
        foreach (['marcaciones_asistencia', 'horarios_trabajo'] as $table) {
            RowLevelSecurity::disable($table);
            Schema::dropIfExists($table);
        }

        Schema::table('sucursales', function (Blueprint $table) {
            $table->dropColumn(['latitud', 'longitud', 'radio_geocerca_metros']);
        });

        $ids = DB::table('permisos')->whereIn('codigo', ['asistencia.marcar', 'asistencia.administrar'])->pluck('id');
        DB::table('permiso_rol')->whereIn('permiso_id', $ids)->delete();
        DB::table('permisos')->whereIn('id', $ids)->delete();
    }
};
