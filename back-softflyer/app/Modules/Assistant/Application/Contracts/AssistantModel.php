<?php

namespace App\Modules\Assistant\Application\Contracts;

use Carbon\CarbonImmutable;

/** Proveedor de lenguaje del asistente (spec 040): solo elige acción y argumentos. */
interface AssistantModel
{
    /**
     * Devuelve una acción (`name` + `arguments`) o una respuesta conversacional (`text`).
     *
     * @param  list<array<string, mixed>>  $tools
     * @return array{name?: string, arguments?: array<string, mixed>, text?: string}|null
     */
    public function respond(string $message, array $tools, CarbonImmutable $now): ?array;
}
