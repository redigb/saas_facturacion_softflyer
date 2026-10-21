<?php

namespace App\Core\Billing\Application;

use App\Core\Billing\Infrastructure\Persistence\DigitalCertificate;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Domain\Ruc;
use App\Core\Tenancy\Infrastructure\Persistence\Branch;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Configuración fiscal de la empresa (spec 017a, Doc. 04 §3 y §9).
 * El certificado y la clave SOL se guardan cifrados y no vuelven a salir por la API.
 */
final class ManageFiscalConfiguration
{
    public function status(): array
    {
        $company = $this->company();
        $certificate = $this->activeCertificate($company);
        $rate = $this->currentRate($company);
        $certificateValid = $certificate !== null && ! $certificate->vence_en->isPast();
        $hasSol = filled($company->usuario_sol) && filled($company->clave_sol_cifrada);

        return [
            'certificado' => $certificate === null ? null : [
                'titular' => $certificate->titular,
                'vence_en' => $certificate->vence_en->toDateString(),
                'vigente' => $certificateValid,
                'dias_restantes' => (int) today()->diffInDays($certificate->vence_en, false),
            ],
            'usuario_sol' => $company->usuario_sol,
            'tiene_clave_sol' => filled($company->clave_sol_cifrada),
            'homologado' => (bool) $company->homologado,
            // Producción solo si el despliegue lo es y la empresa ya homologó (Doc. 04 §4).
            'entorno' => app()->environment('production') && $company->homologado ? 'PRODUCCION' : 'BETA',
            'tasa_igv' => $rate,
            'listo_para_emitir' => $certificateValid && $hasSol && Ruc::isValid((string) $company->ruc),
        ];
    }

    /** Vigentes hoy, para el selector del panel. */
    public function rates(): array
    {
        return DB::table('tasas_igv')
            ->whereDate('vigente_desde', '<=', today())
            ->where(fn ($query) => $query->whereNull('vigente_hasta')->orWhereDate('vigente_hasta', '>=', today()))
            ->orderBy('tasa', 'desc')
            ->get(['id', 'codigo', 'nombre', 'tasa'])
            ->map(fn ($row) => $this->rate($row))
            ->all();
    }

    /** Solo el backoffice lo llama: la facturación de cada cliente la administra Softflyer. */
    public function importCertificate(string $contents, string $password): void
    {
        [$pem, $format] = $this->toPem($contents, $password);

        $info = openssl_x509_parse($pem) ?: throw $this->invalidCertificate();
        $expires = Carbon::createFromTimestamp($info['validTo_time_t'])->startOfDay();
        if ($expires->isPast()) {
            throw new BusinessException('CERTIFICADO_VENCIDO', 'El certificado ya venció. Pide uno nuevo a tu entidad certificadora.', 422, ['certificado' => ['El certificado ya venció.']]);
        }

        DB::transaction(function () use ($pem, $format, $expires, $info) {
            $company = Company::query()->orderBy('id')->lockForUpdate()->firstOrFail();
            // Un solo certificado activo por empresa: el anterior queda como historial.
            DigitalCertificate::where('empresa_id', $company->id)->where('es_activo', true)->update(['es_activo' => false]);
            DigitalCertificate::create([
                'empresa_id' => $company->id,
                'pem_cifrado' => Crypt::encryptString($pem),
                'formato_origen' => $format,
                'vence_en' => $expires->toDateString(),
                'titular' => mb_substr((string) ($info['subject']['CN'] ?? $info['name'] ?? ''), 0, 200) ?: null,
            ]);
        });
        $this->releaseWaitingForCredentials();
    }

    public function saveSolCredentials(string $user, string $password): void
    {
        $this->validateSolCredentials($user, $password);
        DB::transaction(function () use ($user, $password) {
            $company = Company::query()->orderBy('id')->lockForUpdate()->firstOrFail();
            $company->usuario_sol = $user;
            $company->clave_sol_cifrada = Crypt::encryptString($password);
            $company->save();
        });
        $this->releaseWaitingForCredentials();
    }

    /** Errores típicos que SUNAT castiga con 0102: se atajan al guardar, no al emitir. */
    private function validateSolCredentials(string $user, string $password): void
    {
        $errors = [];
        $ruc = (string) $this->company()->ruc;
        if ($user !== trim($user) || preg_match('/\s/', $user)) {
            $errors['usuario_sol'] = ['El usuario SOL no lleva espacios.'];
        } elseif ($ruc !== '' && str_starts_with($user, $ruc)) {
            $errors['usuario_sol'] = ['Escribe solo el usuario SOL, sin el RUC delante.'];
        }
        if ($password !== trim($password)) {
            $errors['clave_sol'] = ['La clave SOL no lleva espacios al inicio ni al final.'];
        } elseif (mb_strlen($password) < 8 || mb_strlen($password) > 12) {
            $errors['clave_sol'] = ['La clave SOL tiene entre 8 y 12 caracteres.'];
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /** Con credenciales nuevas, los comprobantes pausados por ellas vuelven a la cola de inmediato. */
    private function releaseWaitingForCredentials(): void
    {
        Receipt::where('estado', Receipt::PENDING)->where('motivo_espera', Receipt::WAIT_CREDENTIALS)
            ->update(['motivo_espera' => null, 'proximo_intento_en' => now()]);
    }

    /** Tasa de la empresa: la heredan las sucursales que no tengan una propia. */
    public function chooseRate(int $rateId): void
    {
        $this->ensureRateExists($rateId);

        $company = $this->company();
        $company->tasa_igv_id = $rateId;
        $company->save();
    }

    /** Tasa propia de una sucursal (p. ej. 10 % de un restaurante en el mismo RUC que un minimarket al 18 %); nulo vuelve a heredar. */
    public function chooseBranchRate(Branch $branch, ?int $rateId): void
    {
        if ($rateId !== null) {
            $this->ensureRateExists($rateId);
        }
        $branch->update(['tasa_igv_id' => $rateId]);
    }

    private function ensureRateExists(int $rateId): void
    {
        if (! collect($this->rates())->contains('id', $rateId)) {
            throw ValidationException::withMessages(['tasa_igv_id' => ['Elige una tasa de la lista.']]);
        }
    }

    /** @return array{0: string, 1: string} PEM (clave privada + certificado) y formato de origen. */
    private function toPem(string $contents, string $password): array
    {
        if (str_contains($contents, '-----BEGIN')) {
            if (! str_contains($contents, 'PRIVATE KEY') || ! str_contains($contents, 'CERTIFICATE')) {
                throw $this->invalidCertificate();
            }

            return [$contents, 'PEM'];
        }

        if (! openssl_pkcs12_read($contents, $parts, $password)) {
            while (openssl_error_string() !== false);   // no deja errores colgados en el proceso
            throw $this->invalidCertificate();
        }

        return [$parts['pkey'].$parts['cert'].implode('', $parts['extracerts'] ?? []), 'PFX'];
    }

    private function invalidCertificate(): BusinessException
    {
        $message = 'No pudimos leer el certificado. Revisa el archivo y la contraseña.';

        return new BusinessException('CERTIFICADO_INVALIDO', $message, 422, ['certificado' => [$message]]);
    }

    private function currentRate(Company $company): ?array
    {
        $row = $company->tasa_igv_id !== null
            ? DB::table('tasas_igv')->where('id', $company->tasa_igv_id)->first()
            : DB::table('tasas_igv')->where('codigo', 'GENERAL')->whereDate('vigente_desde', '<=', today())->orderByDesc('vigente_desde')->first();

        return $row === null ? null : $this->rate($row);
    }

    private function rate(object $row): array
    {
        return ['id' => (int) $row->id, 'codigo' => $row->codigo, 'nombre' => $row->nombre, 'tasa' => (float) $row->tasa];
    }

    private function activeCertificate(Company $company): ?DigitalCertificate
    {
        return DigitalCertificate::where('empresa_id', $company->id)->where('es_activo', true)->first();
    }

    private function company(): Company
    {
        return Company::query()->orderBy('id')->firstOrFail();
    }
}
