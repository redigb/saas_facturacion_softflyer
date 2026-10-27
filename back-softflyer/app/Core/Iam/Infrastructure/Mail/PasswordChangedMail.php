<?php

namespace App\Core\Iam\Infrastructure\Mail;

use App\Shared\Infrastructure\Mail\QueuedMail;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Aviso de seguridad: si no fue el usuario, sabe que debe actuar. */
class PasswordChangedMail extends QueuedMail
{
    public function __construct(
        public readonly string $name,
        public readonly string $restaurant,
        public readonly string $loginUrl,
        public readonly string $changedAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Tu contraseña de {$this->restaurant} cambió");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.contrasena-cambiada',
            text: 'mail.contrasena-cambiada-texto',
            with: [
                'nombre' => strtok($this->name, ' '),
                'restaurante' => $this->restaurant,
                'url' => $this->loginUrl,
                'fecha' => $this->changedAt,
            ],
        );
    }
}
