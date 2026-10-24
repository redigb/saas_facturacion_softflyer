<?php

namespace App\Core\Tenancy\Presentation;

use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Forma del contrato de specs/011-empresa-sucursales/backend.md. */
final class ConfigurationPresenter
{
    public function company(Company $company): array
    {
        return [
            'id' => $company->id,
            'ruc' => $company->ruc,
            'razon_social' => $company->razon_social,
            'nombre_comercial' => $company->nombre_comercial,
            'direccion_fiscal' => $company->direccion_fiscal,
            'ubigeo' => $this->ubigeos([$company->ubigeo_id])[$company->ubigeo_id] ?? null,
            'homologado' => (bool) $company->homologado,
        ];
    }

    /** @param  Collection<int, Branch>|iterable<Branch>  $branches */
    public function branches(iterable $branches): array
    {
        $branches = collect($branches);
        $ubigeos = $this->ubigeos($branches->pluck('ubigeo_id')->all());

        return $branches->map(fn (Branch $branch) => [
            'id' => $branch->id,
            'nombre' => $branch->nombre,
            'direccion' => $branch->direccion,
            'ubigeo' => $ubigeos[$branch->ubigeo_id] ?? null,
            'codigo_establecimiento' => $branch->codigo_establecimiento,
            'es_principal' => (bool) $branch->es_principal,
            'es_activa' => (bool) $branch->es_activa,
            'exonerado_amazonia' => (bool) $branch->exonerado_amazonia,
            'geocerca' => $branch->latitud === null ? null : [
                'latitud' => (float) $branch->latitud,
                'longitud' => (float) $branch->longitud,
                'radio_metros' => (int) $branch->radio_geocerca_metros,
            ],
        ])->values()->all();
    }

    public function branch(Branch $branch): array
    {
        return $this->branches([$branch])[0];
    }

    /**
     * @param  list<int|null>  $ids
     * @return array<int, array{id: int, codigo: string, departamento: string, provincia: string, distrito: string}>
     */
    private function ubigeos(array $ids): array
    {
        $ids = array_values(array_filter(array_unique($ids)));
        if ($ids === []) {
            return [];
        }

        return DB::table('ubigeos')->whereIn('id', $ids)->get()->mapWithKeys(fn ($row) => [(int) $row->id => [
            'id' => (int) $row->id,
            'codigo' => $row->codigo,
            'departamento' => $row->departamento,
            'provincia' => $row->provincia,
            'distrito' => $row->distrito,
        ]])->all();
    }
}
