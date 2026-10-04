<?php

namespace App\Core\Tenancy\Infrastructure\Mail;

use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class VerifyTrialMail extends Mailable
{
    public function __construct(
        public readonly TrialRegistration $registration,
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
                'nombre' => strtok($this->registration->nombre_contacto, ' '),
                'restaurante' => $this->registration->nombre_comercial,
                'url' => $this->url,
                'dias' => config('softflyer.prueba.dias'),
                'horas' => config('softflyer.prueba.verificacion_horas'),
            ],
        );
    }
}
