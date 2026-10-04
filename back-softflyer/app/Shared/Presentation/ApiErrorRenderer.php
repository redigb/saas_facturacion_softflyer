<?php

namespace App\Shared\Presentation;

use App\Shared\Exceptions\BusinessException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Formato unico de error para toda la API (Doc. 07 §3.3).
 */
final class ApiErrorRenderer
{
    public static function register(Exceptions $exceptions): void
    {
        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            return $request->is('api/*') ? self::render($e) : null;
        });
    }

    private static function render(Throwable $e): JsonResponse
    {
        return match (true) {
            $e instanceof BusinessException => self::error($e->status, $e->codigo, $e->getMessage(), $e->detalles),
            $e instanceof ValidationException => self::error(422, 'VALIDACION', 'Hay campos con errores.', $e->errors()),
            $e instanceof AuthenticationException => self::error(401, 'NO_AUTENTICADO', 'Tu sesión no es válida o expiró.'),
            $e instanceof AccessDeniedHttpException => self::error(403, 'NO_AUTORIZADO', 'No tienes permiso para esta acción.'),
            $e instanceof NotFoundHttpException => self::error(404, 'RECURSO_NO_ENCONTRADO', 'El recurso no existe.'),
            $e instanceof ThrottleRequestsException => self::error(429, 'LIMITE_TECNICO_ALCANZADO', 'Demasiadas solicitudes. Espera unos segundos.'),
            $e instanceof HttpExceptionInterface => self::error($e->getStatusCode(), 'ERROR_HTTP', 'No se pudo procesar la solicitud.'),
            default => self::error(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado.'),
        };
    }

    private static function error(int $status, string $codigo, string $mensaje, ?array $detalles = null): JsonResponse
    {
        return response()->json([
            'error' => [
                'codigo' => $codigo,
                'mensaje' => $mensaje,
                'detalles' => $detalles,
            ],
        ], $status);
    }
}
