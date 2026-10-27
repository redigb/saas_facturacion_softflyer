<?php

namespace App\Core\Iam\Infrastructure\Mail;

use App\Shared\Infrastructure\Mail\QueuedMail;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Bienvenida del alta directa (spec 036): el dueno crea su propia contrasena. */
class ActivateAccountMail extends QueuedMail
{
    public function __construct(
        public readonly string $name,
        public readonly string $restaurant,
        public readonly string $url,
        public readonly string $validFor,
        public readonly string $address,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Activa tu cuenta de {$this->restaurant} en Softflyer");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.activar-cuenta',
            text: 'mail.activar-cuenta-texto',
            with: [
                'nombre' => strtok($this->name, ' '),
                'restaurante' => $this->restaurant,
                'url' => $this->url,
                'vigencia' => $this->validFor,
                'direccion' => $this->address,
            ],
        );
    }
}
