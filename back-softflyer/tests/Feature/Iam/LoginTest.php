<?php

namespace Tests\Feature\Iam;

use App\Core\Tenancy\Domain\TenantStatus;
use Tests\DatabaseTestCase;

class LoginTest extends DatabaseTestCase
{
    public function test_user_logs_in_within_their_tenant(): void
    {
        $tenant = $this->createTenant('demo', ['es_demo' => true]);
        $this->createUser($tenant, ['correo' => 'demo@softflyer.pe']);

        $this->postJson($this->tenantUrl('demo', 'auth/login'), [
            'correo' => 'DEMO@softflyer.pe',
            'contrasena' => 'contrasena-segura',
        ])
            ->assertOk()
            ->assertJsonPath('data.tipo_token', 'Bearer')
            ->assertJsonPath('data.usuario.correo', 'demo@softflyer.pe')
            ->assertJsonPath('data.inquilino.slug', 'demo')
            ->assertJsonPath('data.inquilino.modo', 'DEMO')
            ->assertJsonStructure(['data' => ['token', 'expira_en']]);
    }

    public function test_paid_tenant_reports_paid_mode(): void
    {
        $this->createTenant('donjose');

        $this->getJson($this->tenantUrl('donjose', 'inquilino'))
            ->assertOk()
            ->assertJsonPath('data.modo', 'PAGO')
            ->assertJsonPath('data.estado', 'ACTIVO');
    }

    public function test_wrong_password_is_rejected_with_standard_error(): void
    {
        $tenant = $this->createTenant('demo');
        $this->createUser($tenant);

        $this->postJson($this->tenantUrl('demo', 'auth/login'), [
            'correo' => 'admin@demo.pe',
            'contrasena' => 'otra-cosa',
        ])
            ->assertUnauthorized()
            ->assertExactJson(['error' => [
                'codigo' => 'CREDENCIALES_INVALIDAS',
                'mensaje' => 'Correo o contraseña incorrectos.',
                'detalles' => null,
            ]]);
    }

    public function test_validation_errors_use_standard_format(): void
    {
        $this->createTenant('demo');

        $this->postJson($this->tenantUrl('demo', 'auth/login'), ['correo' => 'no-es-correo'])
            ->assertUnprocessable()
            ->assertJsonPath('error.codigo', 'VALIDACION')
            ->assertJsonStructure(['error' => ['detalles' => ['correo', 'contrasena']]]);
    }

    public function test_unknown_subdomain_returns_not_found(): void
    {
        $this->postJson($this->tenantUrl('noexiste', 'auth/login'), [
            'correo' => 'admin@noexiste.pe',
            'contrasena' => 'contrasena-segura',
        ])
            ->assertNotFound()
            ->assertJsonPath('error.codigo', 'INQUILINO_NO_ENCONTRADO');
    }

    public function test_user_cannot_log_in_through_another_tenant_subdomain(): void
    {
        $this->createTenant('demo');
        $this->createUser($this->createTenant('donjose'), ['correo' => 'jose@donjose.pe']);

        $this->postJson($this->tenantUrl('demo', 'auth/login'), [
            'correo' => 'jose@donjose.pe',
            'contrasena' => 'contrasena-segura',
        ])->assertUnauthorized();
    }

    public function test_account_is_locked_after_five_failed_attempts(): void
    {
        $tenant = $this->createTenant('demo');
        $this->createUser($tenant);
        $credentials = ['correo' => 'admin@demo.pe', 'contrasena' => 'incorrecta'];

        for ($i = 0; $i < 5; $i++) {
            $this->postJson($this->tenantUrl('demo', 'auth/login'), $credentials)->assertUnauthorized();
        }

        $this->postJson($this->tenantUrl('demo', 'auth/login'), [...$credentials, 'contrasena' => 'contrasena-segura'])
            ->assertTooManyRequests()
            ->assertJsonPath('error.codigo', 'BLOQUEO_POR_INTENTOS');
    }

    public function test_inactive_user_and_cancelled_tenant_cannot_log_in(): void
    {
        $this->createUser($this->createTenant('inactivo'), ['es_activo' => false]);
        $this->createUser($this->createTenant('cancelado', ['estado' => TenantStatus::Cancelled]));

        $this->postJson($this->tenantUrl('inactivo', 'auth/login'), ['correo' => 'admin@inactivo.pe', 'contrasena' => 'contrasena-segura'])
            ->assertForbidden()
            ->assertJsonPath('error.codigo', 'USUARIO_INACTIVO');

        $this->postJson($this->tenantUrl('cancelado', 'auth/login'), ['correo' => 'admin@cancelado.pe', 'contrasena' => 'contrasena-segura'])
            ->assertForbidden()
            ->assertJsonPath('error.codigo', 'INQUILINO_CANCELADO');
    }

    public function test_token_returns_profile_and_logout_revokes_it(): void
    {
        $tenant = $this->createTenant('demo');
        $user = $this->createUser($tenant);
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->getJson($this->tenantUrl('demo', 'auth/yo'))
            ->assertOk()
            ->assertJsonPath('data.usuario.id', $user->id)
            ->assertJsonPath('data.inquilino.slug', 'demo');

        $this->withToken($token)->postJson($this->tenantUrl('demo', 'auth/logout'))->assertNoContent();

        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson($this->tenantUrl('demo', 'auth/yo'))
            ->assertUnauthorized()
            ->assertJsonPath('error.codigo', 'NO_AUTENTICADO');
    }

    public function test_token_from_one_tenant_is_rejected_on_another_subdomain(): void
    {
        $this->createTenant('demo');
        $token = $this->createUser($this->createTenant('donjose'))->createToken('web')->plainTextToken;

        $this->withToken($token)->getJson($this->tenantUrl('demo', 'auth/yo'))->assertUnauthorized();
    }
}
