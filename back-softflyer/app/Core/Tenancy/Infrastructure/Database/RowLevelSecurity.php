<?php

namespace App\Core\Tenancy\Infrastructure\Database;

use Illuminate\Support\Facades\DB;

/**
 * Politica de aislamiento por inquilino (Doc. 02 §8).
 *
 * Es fail-closed: si la sesion no fijo app.inquilino_actual, no se ve ninguna fila.
 */
final class RowLevelSecurity
{
    public static function enable(string $table): void
    {
        DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
        DB::statement(<<<SQL
            CREATE POLICY aislamiento_inquilino_{$table} ON {$table}
                USING (inquilino_id = NULLIF(current_setting('app.inquilino_actual', true), '')::bigint)
        SQL);
    }

    public static function disable(string $table): void
    {
        DB::statement("DROP POLICY IF EXISTS aislamiento_inquilino_{$table} ON {$table}");
    }
}
