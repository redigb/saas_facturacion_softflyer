<?php

namespace App\Core\Tenancy\Presentation\Middleware;

use App\Core\Tenancy\Infrastructure\Persistence\IdempotencyKey;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Shared\Exceptions\BusinessException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Un reintento con la misma Idempotency-Key devuelve la respuesta guardada sin
 * volver a ejecutar la operacion (Doc. 07 §5). Va despues de `inquilino`.
 */
final class EnsureIdempotency
{
    public const HEADER = 'Idempotency-Key';

    public function __construct(private readonly TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $key = $this->keyFrom($request);
        $endpoint = $request->method().' /'.$request->path();
        $hash = hash('sha256', $request->getContent());

        // Reservar primero: el UNIQUE decide quien ejecuta si llegan dos a la vez.
        $reserved = IdempotencyKey::query()->insertOrIgnore([
            'inquilino_id' => $this->context->tenant()->getKey(),
            'clave' => $key,
            'endpoint' => $endpoint,
            'hash_solicitud' => $hash,
        ]) === 1;

        if (! $reserved) {
            return $this->replay($key, $endpoint, $hash);
        }

        try {
            $response = $next($request);
        } catch (Throwable $e) {
            $this->release($key, $endpoint);

            throw $e;
        }

        // Un error del servidor no es una respuesta definitiva: el cliente puede reintentar.
        if ($response->getStatusCode() >= 500) {
            $this->release($key, $endpoint);

            return $response;
        }

        $this->find($key, $endpoint)->update([
            'codigo_http' => $response->getStatusCode(),
            'respuesta_guardada' => json_decode((string) $response->getContent(), true),
        ]);

        return $response;
    }

    private function keyFrom(Request $request): string
    {
        $key = $request->header(self::HEADER);

        if ($key === null || $key === '') {
            throw new BusinessException('IDEMPOTENCIA_REQUERIDA', 'Esta operación requiere el header Idempotency-Key.', 400);
        }

        if (! Str::isUuid($key)) {
            throw ValidationException::withMessages([self::HEADER => ['Idempotency-Key debe ser un UUID.']]);
        }

        return strtolower($key);
    }

    private function replay(string $key, string $endpoint, string $hash): Response
    {
        $stored = $this->find($key, $endpoint);

        if ($stored->hash_solicitud !== $hash) {
            throw new BusinessException('IDEMPOTENCIA_CONFLICTO', 'Esta Idempotency-Key ya se usó con otros datos.', 409);
        }

        if ($stored->codigo_http === null) {
            throw new BusinessException('IDEMPOTENCIA_EN_PROCESO', 'La operación todavía se está procesando. Intenta de nuevo en unos segundos.', 409);
        }

        return response()
            ->json($stored->respuesta_guardada, $stored->codigo_http)
            ->header('Idempotency-Replayed', 'true');
    }

    private function find(string $key, string $endpoint): IdempotencyKey
    {
        return IdempotencyKey::query()->where('endpoint', $endpoint)->where('clave', $key)->firstOrFail();
    }

    private function release(string $key, string $endpoint): void
    {
        IdempotencyKey::query()->where('endpoint', $endpoint)->where('clave', $key)->delete();
    }
}
