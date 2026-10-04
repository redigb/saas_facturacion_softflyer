<?php

use App\Platform\Infrastructure\Persistence\PlatformAdmin;
use Illuminate\Support\Facades\Artisan;
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
