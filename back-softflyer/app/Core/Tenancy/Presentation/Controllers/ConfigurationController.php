<?php

namespace App\Core\Tenancy\Presentation\Controllers;

use App\Core\Tenancy\Application\ManageBranches;
use App\Core\Tenancy\Application\ManageCompany;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Presentation\ConfigurationPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Empresa y sucursales (spec 011, specs/011-empresa-sucursales/backend.md). */
class ConfigurationController
{
    public function __construct(
        private readonly ManageCompany $company,
        private readonly ManageBranches $branches,
        private readonly ConfigurationPresenter $presenter,
    ) {}

    public function company(): JsonResponse
    {
        return response()->json(['data' => $this->presenter->company($this->company->get())]);
    }

    public function updateCompany(Request $request): JsonResponse
    {
        if ($request->has('ruc')) {
            $request->merge(['ruc' => preg_replace('/\D/', '', (string) $request->input('ruc'))]);
        }

        $data = $request->validate([
            'ruc' => ['sometimes', 'digits:11'],
            'razon_social' => ['sometimes', 'nullable', 'string', 'min:3', 'max:200'],
            'nombre_comercial' => ['sometimes', 'string', 'min:2', 'max:120'],
            'direccion_fiscal' => ['sometimes', 'nullable', 'string', 'max:250'],
            'ubigeo_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ubigeos', 'id')],
        ], [
            'ruc.digits' => 'El RUC tiene 11 dígitos.',
            'razon_social.min' => 'Escribe la razón social completa.',
            'nombre_comercial.min' => 'Escribe el nombre comercial.',
            'ubigeo_id.exists' => 'Elige un distrito de la lista.',
        ]);

        return response()->json(['data' => $this->presenter->company($this->company->update($data))]);
    }

    public function branches(): JsonResponse
    {
        return response()->json([
            'data' => $this->presenter->branches($this->branches->all()),
            'meta' => ['activas' => $this->branches->activeCount(), 'max_sucursales' => $this->branches->planLimit()],
        ]);
    }

    public function storeBranch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'min:2', 'max:100'],
            'direccion' => ['sometimes', 'nullable', 'string', 'max:250'],
            'ubigeo_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ubigeos', 'id')],
            'codigo_establecimiento' => ['sometimes', 'nullable', 'digits:4'],
            'latitud' => ['sometimes', 'nullable', 'numeric', 'between:-90,90', 'required_with:longitud,radio_geocerca_metros'],
            'longitud' => ['sometimes', 'nullable', 'numeric', 'between:-180,180', 'required_with:latitud,radio_geocerca_metros'],
            'radio_geocerca_metros' => ['sometimes', 'nullable', 'integer', 'between:20,500', 'required_with:latitud,longitud'],
        ], [
            'nombre.required' => 'Ponle un nombre a la sucursal.',
            'codigo_establecimiento.digits' => 'El código de establecimiento tiene 4 dígitos.',
            'ubigeo_id.exists' => 'Elige un distrito de la lista.',
            'radio_geocerca_metros.between' => 'El radio debe estar entre 20 y 500 metros.',
        ]);

        if (($data['codigo_establecimiento'] ?? null) === null) {
            unset($data['codigo_establecimiento']);
        }

        return response()->json(['data' => $this->presenter->branch($this->branches->create($data))], 201);
    }

    public function updateBranch(Request $request, Branch $branch): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'min:2', 'max:100'],
            'direccion' => ['sometimes', 'nullable', 'string', 'max:250'],
            'ubigeo_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ubigeos', 'id')],
            'codigo_establecimiento' => ['sometimes', 'digits:4'],
            'es_activa' => ['sometimes', 'boolean'],
            'es_principal' => ['sometimes', 'accepted'],
            'latitud' => ['sometimes', 'nullable', 'numeric', 'between:-90,90', 'required_with:longitud,radio_geocerca_metros'],
            'longitud' => ['sometimes', 'nullable', 'numeric', 'between:-180,180', 'required_with:latitud,radio_geocerca_metros'],
            'radio_geocerca_metros' => ['sometimes', 'nullable', 'integer', 'between:20,500', 'required_with:latitud,longitud'],
        ], [
            'nombre.min' => 'Ponle un nombre a la sucursal.',
            'codigo_establecimiento.digits' => 'El código de establecimiento tiene 4 dígitos.',
            'ubigeo_id.exists' => 'Elige un distrito de la lista.',
            'es_principal.accepted' => 'Para cambiar la principal, marca otra sucursal como principal.',
            'radio_geocerca_metros.between' => 'El radio debe estar entre 20 y 500 metros.',
        ]);

        if (isset($data['es_principal'])) {
            $data['es_principal'] = true;
        }

        return response()->json(['data' => $this->presenter->branch($this->branches->update($branch, $data))]);
    }

    /** Búsqueda de distritos para el selector (catálogo global INEI). */
    public function ubigeos(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:2', 'max:60']]);
        // Sin extensión unaccent: se normalizan las tildes de ambos lados.
        $term = '%'.Str::of(Str::ascii($data['q']))->lower()->replace(['%', '_'], '')->toString().'%';
        $plain = fn (string $column) => "translate(lower({$column}), 'áéíóúüñ', 'aeiouun')";

        $rows = DB::table('ubigeos')
            ->where(fn ($query) => $query
                ->whereRaw($plain('distrito').' like ?', [$term])
                ->orWhereRaw($plain('provincia').' like ?', [$term])
                ->orWhere('codigo', 'like', $term))
            ->orderBy('departamento')->orderBy('provincia')->orderBy('distrito')
            ->limit(20)
            ->get(['id', 'codigo', 'departamento', 'provincia', 'distrito']);

        return response()->json(['data' => $rows->map(fn ($row) => [
            'id' => (int) $row->id,
            'codigo' => $row->codigo,
            'departamento' => $row->departamento,
            'provincia' => $row->provincia,
            'distrito' => $row->distrito,
        ])->all()]);
    }
}
