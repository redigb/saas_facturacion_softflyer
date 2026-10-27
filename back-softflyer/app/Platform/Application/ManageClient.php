<?php

namespace App\Platform\Application;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use App\Core\Billing\Application\SunatGateway;
use App\Core\Billing\Application\SunatUnavailable;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Iam\Application\ResetPassword;
use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Application\ProvisionTenant;
use App\Core\Tenancy\Application\SubdomainAvailability;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Core\Tenancy\Infrastructure\Persistence\Plan;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use App\Platform\Infrastructure\Persistence\PlatformLog;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Acciones del backoffice sobre un cliente. Cada una escribe dentro del contexto RLS del
 * cliente (mismo rol que la API) y deja constancia en bitacora_plataforma.
 */
final class ManageClient
{
    public function __construct(
        private readonly TenantContext $context,
        private readonly ProvisionTenant $provision,
        private readonly SubdomainAvailability $subdomains,
    ) {}

    /**
     * Prueba -> pago (o renovacion de un cliente de pago). Abre una suscripcion nueva y
     * conserva las anteriores como historial.
     */
    public function activatePlan(Tenant $tenant, string $planCode, int $months, PlatformAdmin $admin): void
    {
        $plan = $this->paidPlan($planCode);

        $this->insideTenant($tenant, function () use ($tenant, $plan, $months, $admin) {
            $subscription = Subscription::create([
                'plan_id' => $plan->id,
                'estado' => 'ACTIVA',
                'fecha_inicio' => today(),
                'fecha_vencimiento' => today()->addMonths($months),
            ]);
            $tenant->update(['estado' => TenantStatus::Active]);

            $this->log($admin, $tenant, 'PLAN_ACTIVADO', [
                'plan' => $plan->nombre,
                'meses' => $months,
                'vence' => $subscription->fecha_vencimiento->toDateString(),
            ]);
        });
    }

    public function extendTrial(Tenant $tenant, int $days, PlatformAdmin $admin): void
    {
        if ($tenant->estado !== TenantStatus::Trial) {
            throw new BusinessException('CLIENTE_NO_EN_PRUEBA', 'Solo se puede extender la prueba de un cliente que está en prueba.', 409);
        }

        $this->insideTenant($tenant, function () use ($tenant, $days, $admin) {
            $subscription = Subscription::orderByDesc('id')->firstOrFail();

            // Si ya vencio, los dias extra se cuentan desde hoy, no desde la fecha vencida.
            $base = $subscription->fecha_vencimiento->max(today());
            $subscription->update(['fecha_vencimiento' => $base->copy()->addDays($days)]);

            $this->log($admin, $tenant, 'PRUEBA_EXTENDIDA', [
                'dias' => $days,
                'vence' => $subscription->fecha_vencimiento->toDateString(),
            ]);
        });
    }

    public function suspend(Tenant $tenant, string $reason, PlatformAdmin $admin): void
    {
        if ($tenant->estado === TenantStatus::Suspended) {
            throw new BusinessException('CLIENTE_YA_SUSPENDIDO', 'El cliente ya está suspendido.', 409);
        }

        $this->insideTenant($tenant, function () use ($tenant, $reason, $admin) {
            $tenant->update(['estado' => TenantStatus::Suspended]);
            $this->log($admin, $tenant, 'CLIENTE_SUSPENDIDO', ['motivo' => $reason]);
        });
    }

    /**
     * Vuelve al estado que corresponde a su suscripcion vigente: prueba o pago.
     */
    public function reactivate(Tenant $tenant, PlatformAdmin $admin): void
    {
        if ($tenant->estado !== TenantStatus::Suspended) {
            throw new BusinessException('CLIENTE_NO_SUSPENDIDO', 'El cliente no está suspendido.', 409);
        }

        $this->insideTenant($tenant, function () use ($tenant, $admin) {
            $subscription = Subscription::orderByDesc('id')->firstOrFail();
            $status = $subscription->estado === 'PRUEBA' ? TenantStatus::Trial : TenantStatus::Active;

            $tenant->update(['estado' => $status]);
            $this->log($admin, $tenant, 'CLIENTE_REACTIVADO', ['estado' => $status->value]);
        });
    }

    /**
     * Corrige los datos de la empresa. El RUC solo cambia mientras no haya comprobantes reales: después de
     * emitir, las series, el certificado y la constancia de SUNAT ya pertenecen a ese RUC.
     *
     * @param  array{ruc?: string, razon_social?: string, nombre_comercial?: string, direccion_fiscal?: ?string}  $changes
     */
    public function updateData(Tenant $tenant, array $changes, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $changes, $admin) {
            $company = Company::query()->orderBy('id')->firstOrFail();
            $changed = array_diff_assoc($changes, $company->only(array_keys($changes)));

            if ($changed === []) {
                return;
            }

            if (array_key_exists('ruc', $changed)) {
                if (Receipt::where('es_simulado', false)->exists()) {
                    throw new BusinessException('RUC_CON_COMPROBANTES', 'No se puede cambiar el RUC: ya emitió comprobantes reales con el actual.', 409);
                }
                // El certificado y el proceso con SUNAT eran de otro RUC.
                $company->homologado = false;
            }

            $company->update($changed);

            if (array_key_exists('nombre_comercial', $changed)) {
                $tenant->update(['nombre' => $changed['nombre_comercial']]);
            }

            $this->log($admin, $tenant, 'CLIENTE_EDITADO', ['campos' => array_keys($changed)]);
        });
    }

    /**
     * Baja definitiva del cliente: pierde el acceso y se cierran sus sesiones. Los datos se conservan.
     * No hay vuelta atrás desde el backoffice; para una pausa se usa suspender.
     */
    public function cancel(Tenant $tenant, string $reason, PlatformAdmin $admin): void
    {
        if ($tenant->estado === TenantStatus::Cancelled) {
            throw new BusinessException('CLIENTE_YA_CANCELADO', 'El cliente ya está cancelado.', 409);
        }

        $this->insideTenant($tenant, function () use ($tenant, $reason, $admin) {
            $tenant->update(['estado' => TenantStatus::Cancelled]);
            User::query()->each(fn (User $user) => $user->tokens()->delete());
            $this->log($admin, $tenant, 'CLIENTE_CANCELADO', ['motivo' => $reason]);
        });
    }

    /**
     * Soporte de acceso (spec 035): el usuario recibe un enlace para crear su contrasena.
     * El administrador nunca la conoce; el enlace se devuelve para enviarlo por otro medio.
     *
     * @return array{correo: string, enlace: string, expira_en: string}
     */
    public function sendPasswordReset(Tenant $tenant, int $userId, PlatformAdmin $admin): array
    {
        if (! $tenant->estado->allowsLogin()) {
            throw new BusinessException('CLIENTE_CANCELADO', 'El cliente está cancelado: sus usuarios no pueden entrar.', 409);
        }

        $result = null;
        $this->insideTenant($tenant, function () use ($tenant, $userId, $admin, &$result) {
            $user = User::find($userId) ?? throw new BusinessException('USUARIO_NO_ENCONTRADO', 'El usuario no existe en este cliente.', 404);
            if (! $user->es_activo) {
                throw new BusinessException('USUARIO_INACTIVO', 'El usuario está desactivado. El cliente debe reactivarlo primero.', 409);
            }

            $reset = app(ResetPassword::class);
            $link = $reset->issue($user, ResetPassword::FROM_PLATFORM);
            $reset->sendLink($user, $link);
            $this->log($admin, $tenant, 'ACCESO_RESTABLECIDO', ['usuario' => $user->nombre, 'correo' => $user->correo]);

            $result = ['correo' => $user->correo, 'enlace' => $link['url'], 'expira_en' => $link['expira_en']->toIso8601ZuluString()];
        });

        return $result;
    }

    /** La empresa ya completó su homologación ante SUNAT (Doc. 04 §7): habilita producción. */
    public function setHomologation(Tenant $tenant, bool $homologated, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $homologated, $admin) {
            $company = Company::query()->orderBy('id')->firstOrFail();
            $company->update(['homologado' => $homologated]);
            $this->log($admin, $tenant, 'HOMOLOGACION_ACTUALIZADA', ['homologado' => $homologated]);
        });
    }

    /** El backoffice carga el certificado del cliente: la facturación no la administra el dueño. */
    public function uploadCertificate(Tenant $tenant, string $contents, string $password, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $contents, $password, $admin) {
            app(ManageFiscalConfiguration::class)->importCertificate($contents, $password);
            $this->log($admin, $tenant, 'CERTIFICADO_CARGADO', []);
        });
    }

    public function saveSolCredentials(Tenant $tenant, string $user, string $password, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $user, $password, $admin) {
            app(ManageFiscalConfiguration::class)->saveSolCredentials($user, $password);
            // La clave nunca entra a la bitácora.
            $this->log($admin, $tenant, 'CREDENCIALES_SOL_ACTUALIZADAS', ['usuario_sol' => $user]);
        });
    }

    /**
     * Pregunta a SUNAT si acepta el usuario y la clave SOL guardados, sin emitir nada.
     *
     * @return array{resultado: string, mensaje: string}
     */
    public function testCredentials(Tenant $tenant): array
    {
        $outcome = null;

        $this->insideTenant($tenant, function () use (&$outcome) {
            if (! app(ManageFiscalConfiguration::class)->status()['listo_para_emitir']) {
                throw new BusinessException('FALTA_CONFIGURAR', 'Carga el certificado y la clave SOL antes de probarlos.', 422);
            }

            try {
                $outcome = app(SunatGateway::class)->checkCredentials(Company::query()->orderBy('id')->firstOrFail());
            } catch (SunatUnavailable) {
                throw new BusinessException('SUNAT_NO_DISPONIBLE', 'SUNAT no respondió. Inténtalo de nuevo en unos minutos.', 503);
            }
        });

        return ['resultado' => $outcome, 'mensaje' => match ($outcome) {
            SunatGateway::CREDENTIALS_OK => 'SUNAT aceptó el usuario y la clave SOL.',
            SunatGateway::CREDENTIALS_REJECTED => 'SUNAT rechazó el usuario o la clave SOL. Revísalos con el cliente.',
            default => 'En pruebas (beta) SUNAT acepta cualquier credencial: solo se pueden verificar en producción.',
        }];
    }

    /** Tasa de IGV de la empresa; las sucursales sin tasa propia la heredan. */
    public function setCompanyRate(Tenant $tenant, int $rateId, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $rateId, $admin) {
            app(ManageFiscalConfiguration::class)->chooseRate($rateId);
            $this->log($admin, $tenant, 'TASA_IGV_ACTUALIZADA', ['alcance' => 'empresa', 'tasa_igv_id' => $rateId]);
        });
    }

    /**
     * IGV de una sucursal: tasa propia (nulo hereda la de la empresa) y si está exonerada por la Amazonía.
     * Solo se cambia lo que viene en `$changes`.
     *
     * @param  array{tasa_igv_id?: ?int, exonerado_amazonia?: bool, leyenda_amazonia?: string}  $changes
     */
    public function setBranchTax(Tenant $tenant, int $branchId, array $changes, PlatformAdmin $admin): void
    {
        $this->insideTenant($tenant, function () use ($tenant, $branchId, $changes, $admin) {
            $branch = Branch::findOrFail($branchId);

            // Solo lo que de verdad cambia queda en la bitácora.
            if (array_key_exists('tasa_igv_id', $changes) && $changes['tasa_igv_id'] !== $branch->tasa_igv_id) {
                app(ManageFiscalConfiguration::class)->chooseBranchRate($branch, $changes['tasa_igv_id']);
                $this->log($admin, $tenant, 'TASA_IGV_ACTUALIZADA', ['alcance' => 'sucursal', 'sucursal' => $branch->nombre, 'tasa_igv_id' => $changes['tasa_igv_id']]);
            }
            $amazonia = array_intersect_key($changes, array_flip(['exonerado_amazonia', 'leyenda_amazonia']));
            if ($amazonia !== [] && array_diff_assoc($amazonia, $branch->only(array_keys($amazonia))) !== []) {
                $branch->update($amazonia);
                $this->log($admin, $tenant, 'AMAZONIA_LOCAL_ACTUALIZADA', ['sucursal' => $branch->nombre, 'exonerado_amazonia' => $branch->exonerado_amazonia, 'leyenda' => $branch->leyenda_amazonia]);
            }
        });
    }

    /**
     * Alta directa de un cliente de pago (venta cerrada fuera de la web).
     * El administrador nace con una contrasena aleatoria que nadie conoce y recibe un enlace
     * para crear la suya (spec 036): el equipo de Softflyer nunca la ve.
     *
     * @param  array{ruc: string, razon_social: string, nombre_comercial: string, slug: string, nombre_contacto: string, correo: string, plan: string, meses: int}  $data
     * @return array{tenant: Tenant, enlace_activacion: string, expira_en: string}
     */
    public function create(array $data, PlatformAdmin $admin): array
    {
        $this->paidPlan($data['plan']);
        $this->subdomains->ensureAvailable($data['slug']);

        try {
            [$tenant, $link] = DB::transaction(function () use ($data, $admin) {
                $tenant = $this->provision->handle(
                    ['slug' => $data['slug'], 'nombre' => $data['nombre_comercial'], 'plan' => $data['plan'], 'estado' => TenantStatus::Active, 'meses' => $data['meses']],
                    ['nombre' => $data['nombre_contacto'], 'correo' => $data['correo'], 'contrasena' => Str::random(64)],
                    ['ruc' => $data['ruc'], 'razon_social' => $data['razon_social']],
                );
                $this->log($admin, $tenant, 'CLIENTE_CREADO', ['ruc' => $data['ruc'], 'correo' => $data['correo'], 'meses' => $data['meses']]);

                // provision deja el contexto del cliente fijado: el enlace se crea bajo su RLS.
                $owner = User::where('correo', $data['correo'])->firstOrFail();
                $reset = app(ResetPassword::class);
                $link = $reset->issue($owner, ResetPassword::FROM_ACTIVATION);
                $reset->sendLink($owner, $link);

                return [$tenant, $link];
            });
        } finally {
            $this->context->clear();
        }

        return ['tenant' => $tenant, 'enlace_activacion' => $link['url'], 'expira_en' => $link['expira_en']->toIso8601ZuluString()];
    }

    private function paidPlan(string $code): Plan
    {
        return Plan::where('codigo', $code)->where('codigo', '!=', 'PRUEBA')->where('es_activo', true)->first()
            ?? throw new BusinessException('PLAN_INVALIDO', 'Elige un plan de pago válido.', 422, ['plan' => ['Elige un plan de pago válido.']]);
    }

    private function insideTenant(Tenant $tenant, callable $callback): void
    {
        try {
            DB::transaction(function () use ($tenant, $callback) {
                $this->context->set($tenant);
                $callback();
            });
        } finally {
            $this->context->clear();
        }
    }

    private function log(PlatformAdmin $admin, Tenant $tenant, string $action, array $detail): void
    {
        PlatformLog::create([
            'administrador_id' => $admin->id,
            'inquilino_id' => $tenant->id,
            'accion' => $action,
            'detalle' => $detail,
        ]);
    }
}
