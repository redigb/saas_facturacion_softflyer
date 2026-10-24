<?php

namespace App\Core\Tenancy\Application;

use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sucursales del restaurante (spec 011). No se borran: se desactivan, porque pedidos,
 * turnos, series y comprobantes cuelgan de ellas. Siempre hay exactamente una principal.
 */
final class ManageBranches
{
    public function __construct(private readonly TenantContext $context) {}

    /** @return Collection<int, Branch> */
    public function all(): Collection
    {
        return Branch::orderByDesc('es_principal')->orderByDesc('es_activa')->orderBy('id')->get();
    }

    /** @param array{nombre: string, direccion?: ?string, ubigeo_id?: ?int, codigo_establecimiento?: ?string, latitud?: ?float, longitud?: ?float, radio_geocerca_metros?: ?int} $data */
    public function create(array $data): Branch
    {
        return DB::transaction(function () use ($data) {
            $company = Company::query()->orderBy('id')->lockForUpdate()->firstOrFail();
            $this->ensurePlanAllowsOneMore();

            $code = $data['codigo_establecimiento'] ?? $this->nextCode($company);
            $this->ensureCodeIsFree($company, $code, null);

            $branch = Branch::create([
                'empresa_id' => $company->id,
                'nombre' => trim($data['nombre']),
                'direccion' => $data['direccion'] ?? null,
                'ubigeo_id' => $data['ubigeo_id'] ?? null,
                'codigo_establecimiento' => $code,
                'es_principal' => false,
                'es_activa' => true,
                'latitud' => $data['latitud'] ?? null,
                'longitud' => $data['longitud'] ?? null,
                'radio_geocerca_metros' => $data['radio_geocerca_metros'] ?? null,
            ]);

            $this->refreshUsage();

            return $branch->refresh();
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Branch $branch, array $data): Branch
    {
        return DB::transaction(function () use ($branch, $data) {
            $company = Company::query()->orderBy('id')->lockForUpdate()->firstOrFail();
            $branch = Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();

            if (isset($data['codigo_establecimiento'])) {
                $this->ensureCodeIsFree($company, $data['codigo_establecimiento'], $branch->id);
            }

            if (array_key_exists('es_activa', $data) && (bool) $data['es_activa'] !== (bool) $branch->es_activa) {
                $data['es_activa'] ? $this->ensurePlanAllowsOneMore() : $this->ensureCanDeactivate($branch);
            }

            if (($data['es_principal'] ?? false) === true && ! $branch->es_principal) {
                if (! $branch->es_activa && ! ($data['es_activa'] ?? false)) {
                    throw new BusinessException('SUCURSAL_INACTIVA', 'Activa la sucursal antes de hacerla principal.');
                }
                // Primero se baja la anterior: el índice único parcial solo admite una.
                Branch::where('es_principal', true)->whereKeyNot($branch->id)->update(['es_principal' => false]);
            }

            $branch->fill(array_intersect_key($data, array_flip([
                'nombre', 'direccion', 'ubigeo_id', 'codigo_establecimiento', 'es_activa',
                'latitud', 'longitud', 'radio_geocerca_metros',
            ])));
            if (($data['es_principal'] ?? false) === true) {
                $branch->es_principal = true;
            }
            $branch->save();

            $this->refreshUsage();

            return $branch->refresh();
        });
    }

    private function ensureCanDeactivate(Branch $branch): void
    {
        if ($branch->es_principal) {
            throw new BusinessException('SUCURSAL_PRINCIPAL', 'No puedes desactivar la sucursal principal. Marca otra como principal primero.');
        }
        if (Branch::where('es_activa', true)->whereKeyNot($branch->id)->doesntExist()) {
            throw new BusinessException('ULTIMA_SUCURSAL', 'Es tu única sucursal activa. Crea otra antes de desactivarla.');
        }

        foreach (app()->tagged('branch.activity') as $probe) {
            /** @var BranchActivity $probe */
            if (($reason = $probe->blockingReason($branch->id)) !== null) {
                throw new BusinessException('SUCURSAL_CON_ACTIVIDAD', $reason);
            }
        }
    }

    /** Máximo de sucursales activas del plan, o nulo si no tiene tope. */
    public function planLimit(): ?int
    {
        return Subscription::with('plan')->latest('fecha_inicio')->latest('id')->first()?->plan?->max_sucursales;
    }

    public function activeCount(): int
    {
        return Branch::where('es_activa', true)->count();
    }

    private function ensurePlanAllowsOneMore(): void
    {
        $limit = $this->planLimit();

        if ($limit !== null && Branch::where('es_activa', true)->count() >= $limit) {
            throw new BusinessException(
                'LIMITE_PLAN_ALCANZADO',
                "Tu plan permite hasta {$limit} ".($limit === 1 ? 'sucursal activa' : 'sucursales activas').'. Desactiva una o mejora tu plan.',
                429,
            );
        }
    }

    private function ensureCodeIsFree(Company $company, string $code, ?int $ignoreId): void
    {
        $taken = Branch::where('empresa_id', $company->id)
            ->where('codigo_establecimiento', $code)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages(['codigo_establecimiento' => ['Ese código de establecimiento ya lo usa otra sucursal.']]);
        }
    }

    /** El siguiente código libre: 0000 es el domicilio fiscal, las demás siguen 0001, 0002… */
    private function nextCode(Company $company): string
    {
        $used = Branch::where('empresa_id', $company->id)->pluck('codigo_establecimiento')->all();

        for ($number = 0; $number <= 9999; $number++) {
            $code = sprintf('%04d', $number);
            if (! in_array($code, $used, true)) {
                return $code;
            }
        }

        throw new BusinessException('SIN_CODIGOS_LIBRES', 'No quedan códigos de establecimiento libres.');
    }

    /** Mantiene el contador del mes (Doc. 03 §5), igual que el de usuarios. */
    private function refreshUsage(): void
    {
        DB::table('uso_inquilino')->upsert(
            [[
                'inquilino_id' => $this->context->id(),
                'periodo' => today()->format('Y-m'),
                'sucursales_activas' => Branch::where('es_activa', true)->count(),
                'creado_en' => now(),
                'actualizado_en' => now(),
            ]],
            ['inquilino_id', 'periodo'],
            ['sucursales_activas', 'actualizado_en'],
        );
    }
}
