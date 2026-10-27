<?php

namespace Tests\Feature;

use App\Core\Iam\Infrastructure\Mail\ActivateAccountMail;
use App\Core\Iam\Infrastructure\Mail\PasswordChangedMail;
use App\Core\Iam\Infrastructure\Mail\ResetPasswordMail;
use App\Core\Tenancy\Infrastructure\Mail\VerifyTrialMail;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Mail\Mailable;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Cada correo se arma en HTML y texto, y sale por la cola cifrado y tras el commit (spec 036). */
class MailTemplatesTest extends TestCase
{
    /** @return array<string, array{0: callable(): Mailable, 1: string}> */
    public static function mails(): array
    {
        $url = 'http://donjose.localhost:3000/restablecer?token=abc';

        return [
            'verificar prueba' => [fn () => new VerifyTrialMail('Luis Paz', 'El Huarique', $url), 'Confirmar mi correo'],
            'restablecer' => [fn () => new ResetPasswordMail('Luis Paz', 'El Huarique', $url, '1 hora'), 'Crear nueva contraseña'],
            'activar' => [fn () => new ActivateAccountMail('Luis Paz', 'El Huarique', $url, '3 días', 'http://donjose.localhost:3000'), 'Crear mi contraseña'],
            'cambiada' => [fn () => new PasswordChangedMail('Luis Paz', 'El Huarique', 'http://donjose.localhost:3000/login', '26/10/2026 10:00'), 'Iniciar sesión'],
        ];
    }

    #[DataProvider('mails')]
    public function test_mail_renders_and_is_queued_encrypted_after_commit(callable $make, string $button): void
    {
        $mail = $make();

        $this->assertInstanceOf(ShouldQueueAfterCommit::class, $mail);
        $this->assertInstanceOf(ShouldBeEncrypted::class, $mail);

        $html = $mail->render();
        $this->assertStringContainsString('Luis', $html);
        $this->assertStringContainsString($button, $html);
        $mail->assertSeeInText('Luis');
    }
}
