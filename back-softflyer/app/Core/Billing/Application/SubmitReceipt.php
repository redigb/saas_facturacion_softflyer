<?php

namespace App\Core\Billing\Application;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Lleva un comprobante hasta un estado final con SUNAT (spec 017b). Nunca lanza por una falla de SUNAT:
 * decide solo qué sigue según lo que SUNAT contestó y deja en `proximo_intento_en` cuándo volver.
 *
 *  - Aceptado / observado / rechazado: final.
 *  - SUNAT no atendió: sigue PENDIENTE_ENVIO y reintenta con espera creciente hasta el plazo legal (VENCIDO).
 *  - Corte ambiguo (pudo llegar): antes de reenviar se consulta el CDR.
 *  - SUNAT ya lo tiene (1033): se consulta el CDR, no se reenvía; pasadas 48 h queda SIN_CDR.
 *  - Credenciales inválidas: pausa sin reintentos hasta que se corrijan.
 */
final class SubmitReceipt
{
    /** Esperas entre reintentos de envío, en segundos; la última se repite. */
    public const BACKOFF = [30, 120, 600, 1800, 3600];

    /** Horas para informar el comprobante a SUNAT, por código de tipo (01 factura, 03 boleta); pasadas, queda VENCIDO. */
    public const SEND_DEADLINE_HOURS = ['01' => 48, '03' => 48];

    /** Horas que se sigue consultando el CDR de un comprobante que SUNAT ya registró. */
    public const CDR_WINDOW_HOURS = 48;

    /** Minutos que se frena todo envío tras una caída de SUNAT, para no golpearla con cada pendiente. */
    public const PAUSE_MINUTES = 2;

    public const PAUSE_KEY = 'sunat.pausa';

    public function __construct(private readonly SunatGateway $gateway) {}

    /** Espera entre consultas del CDR según cuánto lleva registrado: 1 min, 10 min, 1 h y 3 h pasadas las 24 h. */
    public static function cdrDelaySeconds(int $elapsedSeconds): int
    {
        return match (true) {
            $elapsedSeconds < 600 => 60,
            $elapsedSeconds < 3600 => 600,
            $elapsedSeconds < 86400 => 3600,
            default => 10800,
        };
    }

    public function handle(Receipt $receipt): void
    {
        if ($receipt->es_simulado || ! in_array($receipt->estado, [Receipt::PENDING, Receipt::SENT], true)) {
            return;
        }

        if ($receipt->motivo_espera === Receipt::WAIT_CDR) {
            $this->recoverCdr($receipt);

            return;
        }

        if ($this->deadlinePassed($receipt)) {
            $receipt->update(['estado' => Receipt::EXPIRED, 'proximo_intento_en' => null, 'motivo_espera' => null]);

            return;
        }

        try {
            if ($receipt->motivo_espera === Receipt::WAIT_VERIFY && ($known = $this->gateway->cdr($receipt)) !== null) {
                $this->finish($receipt, $known);

                return;
            }

            $response = $this->gateway->send($receipt);
        } catch (SunatAuthFailed $e) {
            $receipt->update([
                'intentos_envio' => $receipt->intentos_envio + 1,
                'ultimo_error_tecnico' => mb_substr($e->getMessage(), 0, 1000),
                'motivo_espera' => Receipt::WAIT_CREDENTIALS,
                'proximo_intento_en' => null,
            ]);

            return;
        } catch (SunatUnavailable $e) {
            $this->scheduleSendRetry($receipt, $e);

            return;
        }

        if ($response->status === SunatResponse::REGISTERED) {
            $this->keepXml($receipt, $response);
            $receipt->update([
                'motivo_espera' => Receipt::WAIT_CDR,
                'registrado_en' => now(),
                'hash_firma' => $response->hash ?? $receipt->hash_firma,
                'intentos_envio' => $receipt->intentos_envio + 1,
                'ultimo_error_tecnico' => null,
                'proximo_intento_en' => now(),
            ]);
            $this->recoverCdr($receipt->fresh());

            return;
        }

        $this->finish($receipt, $response);
    }

    private function scheduleSendRetry(Receipt $receipt, SunatUnavailable $e): void
    {
        $attempts = $receipt->intentos_envio + 1;
        Cache::put(self::PAUSE_KEY, true, now()->addMinutes(self::PAUSE_MINUTES));

        $receipt->update([
            'intentos_envio' => $attempts,
            'ultimo_error_tecnico' => mb_substr($e->getMessage(), 0, 1000),
            'motivo_espera' => $e->maybeReceived ? Receipt::WAIT_VERIFY : Receipt::WAIT_SUNAT_DOWN,
            'proximo_intento_en' => now()->addSeconds(self::BACKOFF[min($attempts, count(self::BACKOFF)) - 1]),
        ]);
    }

    /** SUNAT ya tiene el comprobante: se le pide el CDR hasta que lo entregue o pase la ventana. */
    private function recoverCdr(Receipt $receipt): void
    {
        $elapsed = (int) $receipt->registrado_en->diffInSeconds(now());
        if ($elapsed > self::CDR_WINDOW_HOURS * 3600) {
            $receipt->update(['estado' => Receipt::NO_CDR, 'proximo_intento_en' => null, 'motivo_espera' => null]);

            return;
        }

        try {
            $cdr = $this->gateway->cdr($receipt);
        } catch (SunatAuthFailed $e) {
            $receipt->update(['ultimo_error_tecnico' => mb_substr($e->getMessage(), 0, 1000), 'motivo_espera' => Receipt::WAIT_CREDENTIALS, 'proximo_intento_en' => null]);

            return;
        } catch (SunatUnavailable $e) {
            Cache::put(self::PAUSE_KEY, true, now()->addMinutes(self::PAUSE_MINUTES));
            $receipt->update(['ultimo_error_tecnico' => mb_substr($e->getMessage(), 0, 1000), 'proximo_intento_en' => now()->addSeconds(self::cdrDelaySeconds($elapsed))]);

            return;
        }

        if ($cdr === null) {
            $receipt->update(['proximo_intento_en' => now()->addSeconds(self::cdrDelaySeconds($elapsed))]);

            return;
        }

        $this->finish($receipt, $cdr);
    }

    private function finish(Receipt $receipt, SunatResponse $response): void
    {
        $base = $this->base($receipt);
        $disk = Storage::disk('local');
        $xmlPath = $this->keepXml($receipt, $response) ?? $receipt->ruta_xml;
        if ($response->cdrZip !== null) {
            $disk->put($base.'-cdr.zip', $response->cdrZip);
        }

        $receipt->update([
            'estado' => $response->status,
            'codigo_respuesta_sunat' => $response->code,
            'mensaje_respuesta_sunat' => mb_substr($response->message, 0, 1000),
            'hash_firma' => $response->hash ?? $receipt->hash_firma,
            'ruta_xml' => $xmlPath,
            'ruta_cdr' => $response->cdrZip !== null ? $base.'-cdr.zip' : $receipt->ruta_cdr,
            'intentos_envio' => $receipt->intentos_envio + 1,
            'ultimo_error_tecnico' => null,
            'motivo_espera' => null,
            'proximo_intento_en' => null,
            'enviado_en' => now(),
        ]);
    }

    private function keepXml(Receipt $receipt, SunatResponse $response): ?string
    {
        if ($response->xml === '') {
            return null;
        }
        $path = $this->base($receipt).'.xml';
        Storage::disk('local')->put($path, $response->xml);
        $receipt->ruta_xml = $path;
        $receipt->save();

        return $path;
    }

    private function deadlinePassed(Receipt $receipt): bool
    {
        $hours = self::SEND_DEADLINE_HOURS[$this->typeCode($receipt)] ?? 72;

        return $receipt->emitido_en->addHours($hours)->isPast();
    }

    private function base(Receipt $receipt): string
    {
        return sprintf('comprobantes/%d/%s-%s-%s-%08d', $receipt->inquilino_id, $this->ruc($receipt), $this->typeCode($receipt), $receipt->serie, $receipt->correlativo);
    }

    private function typeCode(Receipt $receipt): string
    {
        return (string) DB::table('tipos_comprobante')->where('id', $receipt->tipo_comprobante_id)->value('codigo');
    }

    private function ruc(Receipt $receipt): string
    {
        return (string) DB::table('empresas')->where('id', $receipt->empresa_id)->value('ruc');
    }
}
