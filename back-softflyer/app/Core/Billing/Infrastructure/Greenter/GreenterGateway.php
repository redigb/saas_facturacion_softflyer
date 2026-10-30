<?php

namespace App\Core\Billing\Infrastructure\Greenter;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use App\Core\Billing\Application\SunatAuthFailed;
use App\Core\Billing\Application\SunatGateway;
use App\Core\Billing\Application\SunatResponse;
use App\Core\Billing\Application\SunatUnavailable;
use App\Core\Billing\Infrastructure\Persistence\DigitalCertificate;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use Greenter\Model\Response\StatusCdrResult;
use Greenter\See;
use Greenter\Ws\Services\ConsultCdrService;
use Greenter\Ws\Services\SoapClient;
use Greenter\Ws\Services\SunatEndpoints;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Envío real con Greenter. Un `See` por envío, nunca compartido: lleva el certificado y la
 * clave SOL de UNA empresa, y reutilizarlo entre trabajos mezclaría inquilinos.
 */
final class GreenterGateway implements SunatGateway
{
    public function __construct(
        private readonly ReceiptGreenterMapper $mapper,
        private readonly ManageFiscalConfiguration $fiscal,
    ) {}

    /** Credenciales SOL que SUNAT rechaza sin mirar el comprobante: reintentar no las arregla. */
    private const AUTH_CODES = ['0101', '0102', '0103', '0104', '0111'];

    /** SUNAT ya tiene el comprobante: llegó en un envío anterior cuya respuesta se perdió. */
    private const ALREADY_REGISTERED = '1033';

    public function send(Receipt $receipt): SunatResponse
    {
        [, $see] = $this->see($receipt);
        $invoice = $this->mapper->invoice($receipt);

        try {
            $result = $see->send($invoice);
        } catch (Throwable $e) {
            // Se cortó con el envío en vuelo: puede haber llegado, así que se consulta antes de reenviar.
            throw new SunatUnavailable('Fallo de conexión con SUNAT: '.$e->getMessage(), true, $e);
        }

        $xml = (string) $see->getXmlSigned($invoice);
        $hash = $this->digest($xml);

        if (! $result->isSuccess()) {
            $code = (string) $result->getError()?->getCode();
            $message = (string) $result->getError()?->getMessage();

            if ($code === self::ALREADY_REGISTERED) {
                return new SunatResponse(SunatResponse::REGISTERED, $code, $message, $xml, null, $hash);
            }
            if (in_array($code, self::AUTH_CODES, true)) {
                throw new SunatAuthFailed("SUNAT respondió {$code}: {$message}");
            }
            // 0100–1999 son fallas del servicio o de la sesión (se reintenta); desde 2000 SUNAT rechazó el documento.
            if (! ctype_digit($code) || (int) $code < 2000) {
                throw new SunatUnavailable("SUNAT respondió {$code}: {$message}", ! ctype_digit($code));
            }

            return new SunatResponse(Receipt::REJECTED, $code, $message, $xml, null, $hash);
        }

        return $this->fromCdr($result->getCdrResponse(), $result->getCdrZip(), $xml, $hash);
    }

    public function sign(Receipt $receipt): string
    {
        [, $see] = $this->see($receipt);
        $hash = $this->digest((string) $see->getXmlSigned($this->mapper->invoice($receipt)));

        return $hash ?? throw new \RuntimeException("El XML firmado del comprobante {$receipt->id} no trae DigestValue.");
    }

    private function digest(string $xml): ?string
    {
        return preg_match('~<ds:DigestValue>([^<]+)</ds:DigestValue>~', $xml, $match) ? $match[1] : null;
    }

    public function cdr(Receipt $receipt): ?SunatResponse
    {
        // La consulta de CDR solo existe en producción; en beta no hay con quién consultar.
        if ($this->fiscal->status()['entorno'] !== 'PRODUCCION') {
            return null;
        }

        $company = Company::findOrFail($receipt->empresa_id);
        $type = (string) DB::table('tipos_comprobante')->where('id', $receipt->tipo_comprobante_id)->value('codigo');
        $result = $this->queryStatus($company, $type, $receipt->serie, (int) $receipt->correlativo);

        if (! $result->isSuccess()) {
            $code = (string) $result->getError()?->getCode();
            if (in_array($code, self::AUTH_CODES, true)) {
                throw new SunatAuthFailed("SUNAT respondió {$code}: ".$result->getError()?->getMessage());
            }
            if (! ctype_digit($code) || (int) $code < 2000 && $code !== '0011') {
                throw new SunatUnavailable("SUNAT respondió {$code} al consultar el CDR");
            }

            return null;   // 0011 y similares: SUNAT no tiene el comprobante (o aún no lo entrega)
        }

        return $result->getCdrZip() === null ? null : $this->fromCdr($result->getCdrResponse(), $result->getCdrZip(), '', null);
    }

    public function checkCredentials(Company $company): string
    {
        if ($this->fiscal->status()['entorno'] !== 'PRODUCCION') {
            return self::CREDENTIALS_UNVERIFIABLE;
        }

        // Una serie que ninguna empresa usa: SUNAT contesta "no existe" solo si antes aceptó al usuario.
        $result = $this->queryStatus($company, '01', 'F999', 99999999);
        if ($result->isSuccess()) {
            return self::CREDENTIALS_OK;
        }

        $code = (string) $result->getError()?->getCode();
        if (in_array($code, self::AUTH_CODES, true)) {
            return self::CREDENTIALS_REJECTED;
        }
        if (! ctype_digit($code) || (int) $code < 2000 && $code !== '0011') {
            throw new SunatUnavailable("SUNAT respondió {$code} al verificar las credenciales");
        }

        return self::CREDENTIALS_OK;
    }

    private function queryStatus(Company $company, string $type, string $series, int $number): StatusCdrResult
    {
        try {
            $client = new SoapClient(SunatEndpoints::FE_CONSULTA_CDR.'?wsdl');
            $client->setCredentials($company->ruc.$company->usuario_sol, Crypt::decryptString($company->clave_sol_cifrada));
            $service = new ConsultCdrService;
            $service->setClient($client);

            return $service->getStatusCdr($company->ruc, $type, $series, $number);
        } catch (Throwable $e) {
            throw new SunatUnavailable('Fallo al consultar SUNAT: '.$e->getMessage(), false, $e);
        }
    }

    private function fromCdr(?object $cdr, ?string $zip, string $xml, ?string $hash): SunatResponse
    {
        $notes = $cdr?->getNotes() ?? [];

        return new SunatResponse(
            $notes === [] ? Receipt::ACCEPTED : Receipt::OBSERVED,
            (string) $cdr?->getCode(),
            trim((string) $cdr?->getDescription().($notes === [] ? '' : ' '.implode(' | ', $notes))),
            $xml,
            $zip,
            $hash,
        );
    }

    /** @return array{0: Company, 1: See} */
    private function see(Receipt $receipt): array
    {
        $company = Company::findOrFail($receipt->empresa_id);
        $certificate = DigitalCertificate::where('empresa_id', $company->id)->where('es_activo', true)->firstOrFail();

        $see = new See;
        $see->setCertificate(Crypt::decryptString($certificate->pem_cifrado));
        $see->setService($this->fiscal->status()['entorno'] === 'PRODUCCION' ? SunatEndpoints::FE_PRODUCCION : SunatEndpoints::FE_BETA);
        $see->setClaveSOL($company->ruc, $company->usuario_sol, Crypt::decryptString($company->clave_sol_cifrada));
        $see->setCachePath(storage_path('app/greenter/cache'));

        return [$company, $see];
    }
}
