<?php

namespace App\Core\Tenancy\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Primera capa de aislamiento (comodidad). La garantia real es RLS (Doc. 01 §3.1).
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('inquilino', function (Builder $query): void {
            $tenantId = app(TenantContext::class)->id();

            if ($tenantId !== null) {
                $query->where($query->qualifyColumn('inquilino_id'), $tenantId);
            }
        });

        static::creating(function (Model $model): void {
            $model->inquilino_id ??= app(TenantContext::class)->id();
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'inquilino_id');
    }
}
