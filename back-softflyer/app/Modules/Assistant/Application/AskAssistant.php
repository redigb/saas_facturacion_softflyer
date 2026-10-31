<?php

namespace App\Modules\Assistant\Application;

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Modules\Assistant\Application\Contracts\AssistantModel;
use App\Modules\Assistant\Infrastructure\Gemini\AssistantModelException;
use App\Shared\Exceptions\BusinessException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Orquesta una pregunta del asistente (spec 040):
 * el modelo elige la acción, el backend valida y consulta, y la respuesta se arma aquí.
 */
final class AskAssistant
{
    /** @return list<string> */
    private const SUGGESTIONS = [
        '¿Cuánto vendí ayer?',
        '¿Cuáles son mis horas punta?',
        '¿Cómo van mis meseros?',
        '¿Cómo está mi inventario?',
        '¿Qué me recomiendas?',
        'Productos más vendidos de este mes',
    ];

    public function __construct(
        private readonly AssistantActions $actions,
        private readonly AssistantModel $model,
        private readonly TenantContext $context,
    ) {}

    /** @return array<string, mixed> */
    public function handle(User $user, string $message): array
    {
        $started = microtime(true);
        $message = trim($message);

        // Fuera de tema o charla social: se responde localmente, sin llamar a Gemini (0 tokens).
        if (! $this->asksForData($message)) {
            $social = $this->socialAnswer($user, $message);

            if ($social !== null) {
                $this->log($user, 'conversacion', true, $started);

                return $social;
            }

            $this->log($user, 'fuera_de_tema', true, $started);

            return $this->offTopic();
        }

        try {
            $decision = $this->model->respond($message, $this->actions->declarations($user), CarbonImmutable::now());

            if ($decision === null) {
                $this->log($user, null, true, $started);

                return $this->help();
            }

            // Charla breve: se permite el texto del modelo, pero nunca en preguntas de datos.
            if (isset($decision['text'])) {
                $text = $this->asksForData($message) ? null : $this->safeText((string) $decision['text']);

                if ($text === null) {
                    $this->log($user, 'texto_rechazado', true, $started);

                    return $this->help();
                }

                $this->log($user, 'conversacion', true, $started);

                return [
                    'respuesta' => $text,
                    'accion' => 'conversacion',
                    'periodo' => null,
                    'visualizacion' => null,
                    'sugerencias' => self::SUGGESTIONS,
                ];
            }

            $result = $this->actions->run($user, $decision['name'], is_array($decision['arguments'] ?? null) ? $decision['arguments'] : []);
            $this->log($user, $decision['name'], true, $started);

            return $result;
        } catch (AssistantModelException $exception) {
            $this->log($user, null, false, $started);

            throw match ($exception->reason) {
                AssistantModelException::NOT_CONFIGURED => new BusinessException('ASISTENTE_NO_CONFIGURADO', 'El asistente aún no está configurado. Pide al administrador que cargue la clave de Gemini.', 503),
                AssistantModelException::QUOTA => new BusinessException('ASISTENTE_SIN_CREDITO', 'El asistente no tiene saldo o cuota disponible en Gemini. Revisa la facturación del proyecto en AI Studio.', 503),
                default => new BusinessException('ASISTENTE_NO_DISPONIBLE', 'El asistente no está disponible en este momento. Inténtalo más tarde.', 502),
            };
        } catch (BusinessException $exception) {
            $this->log($user, null, false, $started);

            throw $exception;
        } catch (Throwable) {
            $this->log($user, null, false, $started);

            throw new BusinessException('ASISTENTE_ERROR', 'No pudimos completar la consulta. Inténtalo de nuevo.', 502);
        }
    }

    /** @return array<string, mixed> */
    private function help(): array
    {
        return [
            'respuesta' => 'Puedo consultarte ventas de hoy, ayer, la semana, el mes o el año; comparar períodos; mostrarte tus horas punta y platos más vendidos; revisar stock bajo y darte recomendaciones con tus datos 📊. Prueba con una de las sugerencias.',
            'accion' => null,
            'periodo' => null,
            'visualizacion' => null,
            'sugerencias' => self::SUGGESTIONS,
        ];
    }

    /** @return array<string, mixed>|null */
    private function socialAnswer(User $user, string $message): ?array
    {
        $text = Str::ascii(mb_strtolower($message));
        $name = $this->firstName($user);

        if (preg_match('/\b(ayuda|que puedes hacer|para que sirves|que sabes hacer|como funciona)\b/u', $text) === 1) {
            return $this->conversation(
                'Puedo ayudarte con ventas, comparaciones, horas punta, productos más vendidos, stock bajo y recomendaciones 📊. Pregúntame lo que necesites de tu restaurante.'
            );
        }

        if (preg_match('/\b(gracias|te agradezco|agradecido|agradecida)\b/u', $text) === 1) {
            return $this->conversation("¡De nada, {$name}! 🙌 Aquí estoy si necesitas otra cosa.");
        }

        if (preg_match('/\b(chau|adios|hasta luego|nos vemos|bye)\b/u', $text) === 1) {
            return $this->conversation("¡Chau, {$name}! 👋 Que tengas un buen turno.");
        }

        if (preg_match('/\b(como estas|como va todo|que tal)\b/u', $text) === 1) {
            return $this->conversation("¡Muy bien, {$name}! 😄 ¿Y tú? ¿Revisamos algo de tu restaurante?");
        }

        if (preg_match('/\b(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|saludos)\b/u', $text) === 1) {
            $greetings = [
                "¡Hola, {$name}! 👋 ¿Qué revisamos hoy? Puedo ver ventas, horas punta o recomendarte algo.",
                "¡Buenas, {$name}! 😊 ¿En qué te ayudo con tu restaurante?",
                "¡Hey, {$name}! 🙌 ¿Vemos tus números de hoy?",
            ];

            return $this->conversation($greetings[random_int(0, count($greetings) - 1)]);
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function offTopic(): array
    {
        return $this->conversation(
            'Solo puedo ayudarte con la operación de tu restaurante 🍽️: ventas, productos, horas punta, stock y recomendaciones. ¿Quieres revisar algo de eso?',
            'fuera_de_tema',
        );
    }

    /** @return array<string, mixed> */
    private function conversation(string $text, string $action = 'conversacion'): array
    {
        return [
            'respuesta' => $text,
            'accion' => $action,
            'periodo' => null,
            'visualizacion' => null,
            'sugerencias' => self::SUGGESTIONS,
        ];
    }

    private function asksForData(string $message): bool
    {
        $text = Str::ascii(mb_strtolower($message));

        return preg_match('/\b(vend\w*|venta\w*|ingres\w*|factur\w*|boleta\w*|stock|inventario|producto\w*|plato\w*|hora\w*|punta\w*|recomiend\w*|recomend\w*|compar\w*|ticket\w*|caja\w*|pedido\w*|mesa\w*|cliente\w*|gane\w*|ganancia\w*|dinero|plata|negocio\w*|restaurante\w*|local\w*|resultado\w*|marcha|turno\w*|comanda\w*|mesero\w*|mesera\w*|mozo\w*|vendedor\w*|equipo)\b/u', $text) === 1;
    }

    private function firstName(User $user): string
    {
        $name = trim((string) $user->nombre);

        return $name === '' ? 'chef' : (string) Str::of($name)->explode(' ')->first();
    }

    private function log(User $user, ?string $action, bool $ok, float $started): void
    {
        // Nunca se registra la pregunta ni los resultados: solo métricas de uso.
        Log::info('asistente.consulta', [
            'inquilino_id' => $this->context->id(),
            'usuario_id' => $user->id,
            'accion' => $action,
            'ok' => $ok,
            'ms' => (int) round((microtime(true) - $started) * 1000),
        ]);
    }
}
