<?php

use App\Core\Iam\Infrastructure\Persistence\User;
use App\Modules\Restaurant\Infrastructure\Persistence\PreparationStation;
use Illuminate\Support\Facades\Broadcast;

// Canales privados del restaurante (Doc. 08 §8, spec 005). Se autorizan en
// /api/v1/broadcasting/auth con el inquilino resuelto: una sucursal o estación de
// otro restaurante no existe para RLS, así que la suscripción se rechaza.

$kitchen = fn (User $user, int $branch) => $user->worksAt($branch)
    && ($user->hasPermission('restaurante.cocina.actualizar_estado') || $user->hasPermission('panel.ver'));

Broadcast::channel('sucursal.{branch}.salon', fn (User $user, int $branch) => $user->worksAt($branch));

// Comandas de platos sin estación (spec 006). Va antes que `estacion.{station}`, que
// también coincidiría con "general".
Broadcast::channel('sucursal.{branch}.estacion.general', $kitchen);

Broadcast::channel('sucursal.{branch}.estacion.{station}', fn (User $user, int $branch, string $station) => ctype_digit($station)
    && $kitchen($user, $branch)
    && PreparationStation::whereKey((int) $station)->exists());

Broadcast::channel('sucursal.{branch}.mozo.{waiter}', fn (User $user, int $branch, int $waiter) => $user->getKey() === $waiter
    && $user->worksAt($branch));

// Caja (spec 009): cobros y turnos de la sucursal, para quien cobra o supervisa.
Broadcast::channel('sucursal.{branch}.caja', fn (User $user, int $branch) => $user->worksAt($branch)
    && ($user->hasPermission('caja.abrir') || $user->hasPermission('caja.ver_movimientos') || $user->hasPermission('panel.ver')));
