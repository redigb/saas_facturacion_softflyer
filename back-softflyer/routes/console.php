<?php

use App\Core\Billing\Application\SubmitReceipt;
use App\Core\Billing\Infrastructure\Jobs\SendReceiptJob;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Infrastructure\Persistence\IdempotencyKey;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;

// Crea (o reactiva) un administrador del backoffice: php artisan softflyer:admin correo@dominio.com
Artisan::command('softflyer:admin {correo} {--nombre=}', function (string $correo) {
    $correo = mb_strtolower($correo);
    $nombre = $this->option('nombre') ?: $this->ask('Nombre');
    $contrasena = $this->secret('Contraseña (mínimo 12 caracteres)');

    $validator = Validator::make(
        ['correo' => $correo, 'nombre' => $nombre, 'contrasena' => $contrasena],
        ['correo' => ['required', 'email'], 'nombre' => ['required', 'string'], 'contrasena' => ['required', 'min:12']],
    );

    if ($validator->fails()) {
        $this->error($validator->errors()->first());

        return 1;
    }

    PlatformAdmin::updateOrCreate(['correo' => $correo], [
        'nombre' => $nombre,
        'contrasena' => $contrasena,
        'es_activo' => true,
    ]);

    $this->info('Administrador listo. Ingresa en admin.'.config('softflyer.dominio_central')." con {$correo}.");

    return 0;
})->purpose('Crear o actualizar un administrador del backoffice de Softflyer');

// Borra las Idempotency-Key vencidas (spec 001). RLS es fail-closed: se limpia inquilino por inquilino.
Artisan::command('softflyer:limpiar-idempotencia', function (TenantContext $context) {
    $deleted = 0;

    Tenant::query()->each(function (Tenant $tenant) use ($context, &$deleted): void {
        $context->set($tenant);
        $deleted += IdempotencyKey::query()->where('creado_en', '<', now()->subHours(IdempotencyKey::TTL_HOURS))->delete();
    });

    $context->clear();
    $this->info("Claves de idempotencia borradas: {$deleted}.");
})->purpose('Borrar las claves de idempotencia de mas de 24 horas');

Schedule::command('softflyer:limpiar-idempotencia')->hourly();

// Reintento automático de comprobantes pendientes (spec 017b): toma los que ya les toca volver a SUNAT y los encola.
// También rescata los que nunca salieron (la cola estuvo caída). Cada minuto; si SUNAT acaba de fallar, espera.
Artisan::command('softflyer:enviar-pendientes', function (TenantContext $context) {
    if (Cache::has(SubmitReceipt::PAUSE_KEY)) {
        $this->line('SUNAT en pausa tras una caída reciente; se reintenta en el próximo ciclo.');

        return 0;
    }

    $queued = 0;
    Tenant::query()->each(function (Tenant $tenant) use ($context, &$queued): void {
        $context->set($tenant);
        $due = Receipt::query()
            ->where('estado', Receipt::PENDING)->where('es_simulado', false)
            ->where(fn ($query) => $query
                ->where('proximo_intento_en', '<=', now())
                ->orWhere(fn ($stuck) => $stuck->whereNull('proximo_intento_en')->whereNull('motivo_espera')->where('emitido_en', '<', now()->subMinutes(2))))
            ->orderBy('id')->limit(200)->get(['id']);

        foreach ($due as $receipt) {
            // Se reserva 5 minutos antes de encolar: dos ciclos seguidos no lo mandan dos veces.
            Receipt::whereKey($receipt->id)->update(['proximo_intento_en' => now()->addMinutes(5)]);
            SendReceiptJob::dispatch($tenant->id, $receipt->id);
            $queued++;
        }
    });

    $context->clear();
    $this->info("Comprobantes encolados: {$queued}.");

    return 0;
})->purpose('Reintentar el envío a SUNAT de los comprobantes pendientes');

Schedule::command('softflyer:enviar-pendientes')->everyMinute()->withoutOverlapping();
