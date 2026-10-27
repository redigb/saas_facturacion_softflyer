<?php

namespace Tests\Feature\Iam;

use App\Core\Iam\Infrastructure\Mail\PasswordChangedMail;
use App\Core\Iam\Infrastructure\Mail\ResetPasswordMail;
use App\Core\Iam\Infrastructure\Persistence\PasswordReset;
use App\Core\Tenancy\Domain\TenantStatus;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Support\Facades\Mail;
use Tests\DatabaseTestCase;

class PasswordResetTest extends DatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_forgot_password_mails_a_link_to_the_tenant_subdomain(): void
    {
        $tenant = $this->createTenant('donjose');
        $this->createUser($tenant);

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/olvide'), ['correo' => 'ADMIN@donjose.pe'])
            ->assertStatus(202)
            ->assertJsonPath('data.mensaje', 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.');

        Mail::assertQueued(ResetPasswordMail::class, function (ResetPasswordMail $mail) {
            return $mail->hasTo('admin@donjose.pe')
                && str_starts_with($mail->url, 'http://donjose.localhost:3000/restablecer?token=');
        });
        $this->inside($tenant, fn () => $this->assertSame('USUARIO', PasswordReset::sole()->origen));
    }

    public function test_unknown_email_gets_the_same_answer_and_no_mail(): void
    {
        $this->createUser($this->createTenant('donjose'));

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/olvide'), ['correo' => 'nadie@donjose.pe'])
            ->assertStatus(202);

        Mail::assertNothingOutgoing();
    }

    public function test_email_of_another_tenant_is_not_found_from_this_subdomain(): void
    {
        $this->createTenant('demo');
        $this->createUser($this->createTenant('donjose'));

        $this->postJson($this->tenantUrl('demo', 'auth/contrasena/olvide'), ['correo' => 'admin@donjose.pe'])
            ->assertStatus(202);

        Mail::assertNothingOutgoing();
    }

    public function test_link_sets_a_new_password_closes_sessions_and_works_only_once(): void
    {
        $tenant = $this->createTenant('donjose');
        $user = $this->createUser($tenant);
        $this->inside($tenant, fn () => $user->createToken('web'));
        $token = $this->requestToken('donjose', 'admin@donjose.pe');

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'nueva-clave-segura',
            'contrasena_confirmation' => 'nueva-clave-segura',
        ])->assertOk()->assertJsonPath('data.correo', 'admin@donjose.pe');

        $this->inside($tenant, fn () => $this->assertSame(0, $user->tokens()->count()));
        Mail::assertQueued(PasswordChangedMail::class, fn (PasswordChangedMail $mail) => $mail->hasTo('admin@donjose.pe'));

        $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'admin@donjose.pe', 'contrasena' => 'contrasena-segura'])
            ->assertUnauthorized();
        $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'admin@donjose.pe', 'contrasena' => 'nueva-clave-segura'])
            ->assertOk();

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'otra-clave-segura',
            'contrasena_confirmation' => 'otra-clave-segura',
        ])->assertNotFound()->assertJsonPath('error.codigo', 'ENLACE_INVALIDO');
    }

    public function test_a_new_link_replaces_the_previous_one(): void
    {
        $this->createUser($this->createTenant('donjose'));
        $first = $this->requestToken('donjose', 'admin@donjose.pe');
        $this->requestToken('donjose', 'admin@donjose.pe');

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $first,
            'contrasena' => 'nueva-clave-segura',
            'contrasena_confirmation' => 'nueva-clave-segura',
        ])->assertNotFound();
    }

    public function test_expired_link_is_rejected(): void
    {
        $tenant = $this->createTenant('donjose');
        $this->createUser($tenant);
        $token = $this->requestToken('donjose', 'admin@donjose.pe');
        $this->inside($tenant, fn () => PasswordReset::query()->update(['expira_en' => now()->subMinute()]));

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'nueva-clave-segura',
            'contrasena_confirmation' => 'nueva-clave-segura',
        ])->assertStatus(410)->assertJsonPath('error.codigo', 'ENLACE_VENCIDO');
    }

    public function test_token_of_one_tenant_does_not_work_on_another_subdomain(): void
    {
        $this->createTenant('demo');
        $this->createUser($this->createTenant('donjose'));
        $token = $this->requestToken('donjose', 'admin@donjose.pe');

        $this->postJson($this->tenantUrl('demo', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'nueva-clave-segura',
            'contrasena_confirmation' => 'nueva-clave-segura',
        ])->assertNotFound();
    }

    public function test_new_password_must_be_long_and_confirmed(): void
    {
        $this->createUser($this->createTenant('donjose'));
        $token = $this->requestToken('donjose', 'admin@donjose.pe');

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'corta',
            'contrasena_confirmation' => 'otra',
        ])->assertUnprocessable()->assertJsonPath('error.detalles.contrasena.0', 'La contraseña debe tener al menos 10 caracteres.');
    }

    public function test_reset_unlocks_an_account_blocked_by_failed_attempts(): void
    {
        $this->createUser($this->createTenant('donjose'));
        for ($i = 0; $i < 5; $i++) {
            $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'admin@donjose.pe', 'contrasena' => 'incorrecta']);
        }
        $token = $this->requestToken('donjose', 'admin@donjose.pe');

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/restablecer'), [
            'token' => $token,
            'contrasena' => 'nueva-clave-segura',
            'contrasena_confirmation' => 'nueva-clave-segura',
        ])->assertOk();

        $this->postJson($this->tenantUrl('donjose', 'auth/login'), ['correo' => 'admin@donjose.pe', 'contrasena' => 'nueva-clave-segura'])
            ->assertOk();
    }

    public function test_inactive_user_and_cancelled_tenant_get_no_link(): void
    {
        $this->createUser($this->createTenant('donjose'), ['es_activo' => false]);
        $this->createUser($this->createTenant('lacasona', ['estado' => TenantStatus::Cancelled]));

        $this->postJson($this->tenantUrl('donjose', 'auth/contrasena/olvide'), ['correo' => 'admin@donjose.pe'])->assertStatus(202);
        $this->postJson($this->tenantUrl('lacasona', 'auth/contrasena/olvide'), ['correo' => 'admin@lacasona.pe'])->assertStatus(202);

        Mail::assertNothingOutgoing();
    }

    private function requestToken(string $slug, string $email): string
    {
        $this->postJson($this->tenantUrl($slug, 'auth/contrasena/olvide'), ['correo' => $email])->assertStatus(202);

        $url = '';
        Mail::assertQueued(ResetPasswordMail::class, function (ResetPasswordMail $mail) use (&$url) {
            $url = $mail->url;

            return true;
        });
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        return $query['token'];
    }

    private function inside(Tenant $tenant, callable $callback): void
    {
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        $callback();
        $context->clear();
    }
}
