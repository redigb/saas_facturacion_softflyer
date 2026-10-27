<?php

namespace App\Shared\Infrastructure\Mail;

use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Mail\Mailable;

/**
 * Todo correo sale por la cola (spec 036): la peticion no espera al proveedor, se reintenta
 * si falla y no se envia si la transaccion que lo origino se deshace. La carga va cifrada
 * porque suele llevar un enlace con token.
 *
 * Solo datos simples: el worker corre sin contexto de inquilino y RLS no le dejaria volver
 * a leer un modelo del restaurante.
 */
abstract class QueuedMail extends Mailable implements ShouldBeEncrypted, ShouldQueueAfterCommit
{
    public $tries = 3;

    /** @var list<int> */
    public $backoff = [60, 300];
}
