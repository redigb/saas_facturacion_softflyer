<?php

namespace App\Core\Tenancy\Application;

use App\Core\Tenancy\Domain\Ruc;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Datos fiscales de la empresa del inquilino (spec 011, Doc. 08 §11.2).
 * Hoy hay una empresa por restaurante. El certificado y la clave SOL llegan con Greenter.
 */
final class ManageCompany
{
    public function get(): Company
    {
        return Company::query()->orderBy('id')->firstOrFail();
    }

    /** @param array<string, mixed> $data */
    public function update(array $data): Company
    {
        return DB::transaction(function () use ($data) {
            $company = Company::query()->orderBy('id')->lockForUpdate()->firstOrFail();

            if (array_key_exists('ruc', $data) && $data['ruc'] !== $company->ruc) {
                if (! Ruc::isValid((string) $data['ruc'])) {
                    throw ValidationException::withMessages(['ruc' => ['El RUC no es válido. Revísalo e inténtalo de nuevo.']]);
                }
                if (DB::table('comprobantes')->where('empresa_id', $company->id)->where('es_simulado', false)->exists()) {
                    throw new BusinessException('RUC_CON_COMPROBANTES', 'No puedes cambiar el RUC: ya emitiste comprobantes con él.');
                }
            }

            $company->fill(array_intersect_key($data, array_flip(['ruc', 'razon_social', 'nombre_comercial', 'direccion_fiscal', 'ubigeo_id'])));
            $company->save();

            return $company->refresh();
        });
    }
}
