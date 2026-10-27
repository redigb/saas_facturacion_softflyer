<?php

namespace App\Core\Iam\Infrastructure\Mail;

use App\Shared\Infrastructure\Mail\QueuedMail;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ResetPasswordMail extends QueuedMail
{
    public function __construct(
        public readonly string $name,
        public readonly string $restaurant,
        public readonly string $url,
        public readonly string $validFor,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Crea una nueva contraseña para {$this->restaurant}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.restablecer-contrasena',
            text: 'mail.restablecer-contrasena-texto',
            with: [
                'nombre' => strtok($this->name, ' '),
                'restaurante' => $this->restaurant,
                'url' => $this->url,
                'vigencia' => $this->validFor,
            ],
        );
    }
}
