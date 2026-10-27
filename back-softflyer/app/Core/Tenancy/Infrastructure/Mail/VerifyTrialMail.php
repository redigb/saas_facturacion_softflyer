<?php

namespace App\Core\Tenancy\Infrastructure\Mail;

use App\Shared\Infrastructure\Mail\QueuedMail;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class VerifyTrialMail extends QueuedMail
{
    public function __construct(
        public readonly string $name,
        public readonly string $restaurant,
        public readonly string $url,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirma tu correo para activar tu prueba gratis');
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.verificar-prueba',
            text: 'mail.verificar-prueba-texto',
            with: [
                'nombre' => strtok($this->name, ' '),
                'restaurante' => $this->restaurant,
                'url' => $this->url,
                'dias' => config('softflyer.prueba.dias'),
                'horas' => config('softflyer.prueba.verificacion_horas'),
            ],
        );
    }
}
