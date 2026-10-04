<?php

namespace Tests\Feature\Tenancy;

use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;

/**
 * Pruebas de aislamiento obligatorias (Doc. 03 §7). Consultan SQL directo, sin el
 * Global Scope de Eloquent, para comprobar que es PostgreSQL quien aisla.
 */
class RowLevelSecurityTest extends DatabaseTestCase
{
    public function test_api_connection_is_subject_to_rls(): void
    {
        $role = DB::selectOne('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');

        $this->assertFalse($role->rolsuper, 'La API no puede conectarse como superusuario: se salta RLS.');
        $this->assertFalse($role->rolbypassrls, 'La API no puede tener BYPASSRLS.');
    }

    public function test_tenant_only_sees_its_own_rows(): void
    {
        $demo = $this->createTenant('demo');
        $this->createUser($demo);
        $this->createUser($this->createTenant('donjose'));

        $this->app->make(TenantContext::class)->set($demo);

        $this->assertSame(['admin@demo.pe'], DB::table('usuarios')->pluck('correo')->all());
    }

    public function test_without_tenant_no_rows_are_visible(): void
    {
        $this->createUser($this->createTenant('demo'));
        $this->app->make(TenantContext::class)->clear();

        $this->assertSame(0, DB::table('usuarios')->count());
    }

    public function test_cannot_insert_rows_for_another_tenant(): void
    {
        $demo = $this->createTenant('demo');
        $other = $this->createTenant('donjose');
        $this->app->make(TenantContext::class)->set($demo);

        // 42501 = insufficient_privilege: la politica rechaza la fila (independiente del idioma de PostgreSQL).
        $this->expectExceptionMessage('SQLSTATE[42501]');

        DB::table('usuarios')->insert([
            'inquilino_id' => $other->id,
            'nombre' => 'Intruso',
            'correo' => 'intruso@donjose.pe',
            'contrasena' => 'x',
        ]);
    }

    public function test_row_cannot_point_to_a_parent_of_another_tenant(): void
    {
        $demo = $this->createTenant('demo');
        $other = $this->createTenant('donjose');
        $context = $this->app->make(TenantContext::class);

        $context->set($other);
        $foreignCompany = DB::table('empresas')->insertGetId(['inquilino_id' => $other->id, 'nombre_comercial' => 'Ajena']);

        $context->set($demo);

        // 23503 = foreign_key_violation: la FK compuesta (inquilino_id, empresa_id) no encuentra al padre.
        $this->expectExceptionMessage('SQLSTATE[23503]');

        DB::table('sucursales')->insert([
            'inquilino_id' => $demo->id,
            'empresa_id' => $foreignCompany,
            'nombre' => 'Sucursal intrusa',
        ]);
    }

    public function test_every_tenant_table_has_an_isolation_policy(): void
    {
        // Tablas globales que solo referencian a un inquilino, sin pertenecerle.
        $global = ['registros_prueba', 'bitacora_plataforma'];

        $unprotected = DB::select(<<<'SQL'
            SELECT c.table_name
            FROM information_schema.columns c
            JOIN pg_class t ON t.relname = c.table_name AND t.relnamespace = 'public'::regnamespace
            WHERE c.table_schema = 'public'
              AND c.column_name = 'inquilino_id'
              AND (NOT t.relrowsecurity
                   OR NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = c.table_name))
        SQL);

        $this->assertSame([], array_values(array_diff(array_column($unprotected, 'table_name'), $global)), 'Tablas con inquilino_id sin RLS.');
    }
}
