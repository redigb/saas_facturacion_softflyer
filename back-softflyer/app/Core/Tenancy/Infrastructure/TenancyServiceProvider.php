<?php

namespace App\Core\Tenancy\Infrastructure;

use App\Core\Cash\Application\OpenCashSessionsActivity;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\ServiceProvider;

class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(TenantContext::class);

        // Quien tenga trabajo en curso en una sucursal se declara aquí (spec 011).
        $this->app->tag([OpenCashSessionsActivity::class], 'branch.activity');
    }

    public function boot(): void
    {
        $this->registerSchemaMacros();
    }

    /**
     * Atajos para tablas multi-inquilino (Doc. 08 §2.1).
     */
    private function registerSchemaMacros(): void
    {
        // inquilino_id + UNIQUE (inquilino_id, id), destino de las FK compuestas.
        Blueprint::macro('inquilino', function (): void {
            /** @var Blueprint $this */
            $this->foreignId('inquilino_id')->constrained('inquilinos')->restrictOnDelete();
            $this->unique(['inquilino_id', 'id']);
        });

        // FK compuesta: el padre siempre pertenece al mismo inquilino que el hijo.
        Blueprint::macro('perteneceA', function (string $column, string $table, bool $nullable = false) {
            /** @var Blueprint $this */
            $definition = $this->unsignedBigInteger($column)->nullable($nullable);
            $this->foreign(['inquilino_id', $column])->references(['inquilino_id', 'id'])->on($table)->restrictOnDelete();

            return $definition;
        });

        Blueprint::macro('marcasDeTiempo', function (bool $softDeletes = false): void {
            /** @var Blueprint $this */
            $this->timestampTz('creado_en')->nullable();
            $this->timestampTz('actualizado_en')->nullable();

            if ($softDeletes) {
                $this->softDeletesTz('eliminado_en');
            }
        });
    }
}
