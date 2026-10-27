<?php

namespace Tests\Feature\Tenancy;

use App\Core\Tenancy\Infrastructure\Mail\VerifyTrialMail;
use App\Core\Tenancy\Infrastructure\Persistence\Subscription;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Database\Seeders\CatalogoSunatSeeder;
use Database\Seeders\PermisoPlanSeeder;
use Illuminate\Support\Facades\Mail;
use Tests\DatabaseTestCase;

class TrialRegistrationTest extends DatabaseTestCase
{
    private const CENTRAL = 'http://localhost/api/v1/';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CatalogoSunatSeeder::class, PermisoPlanSeeder::class]);
        Mail::fake();
    }

    public function test_full_trial_flow_from_signup_to_first_login(): void
    {
        $this->postJson(self::CENTRAL.'registro', $this->form())
            ->assertCreated()
            ->assertJsonPath('data.slug', 'lacasona');

        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $this->sentToken()])
            ->assertOk()
            ->assertJsonPath('data.slug', 'lacasona');

        $tenant = Tenant::where('slug', 'lacasona')->firstOrFail();
        $this->assertSame('PRUEBA', $tenant->estado->value);

        $this->postJson($this->tenantUrl('lacasona', 'auth/login'), [
            'correo' => 'ana@lacasona.pe',
            'contrasena' => 'contrasena-segura',
        ])
            ->assertOk()
            ->assertJsonPath('data.inquilino.modo', 'PRUEBA')
            ->assertJsonPath('data.inquilino.prueba.dias_restantes', config('softflyer.prueba.dias'))
            ->assertJsonPath('data.inquilino.prueba.vencida', false);

        $this->app->make(TenantContext::class)->set($tenant);
        $this->assertDatabaseHas('empresas', ['ruc' => '20000000001', 'razon_social' => 'LA CASONA S.A.C.']);
    }

    public function test_invalid_ruc_and_reserved_subdomain_are_rejected(): void
    {
        $this->postJson(self::CENTRAL.'registro', $this->form(['ruc' => '20000000002']))
            ->assertUnprocessable()
            ->assertJsonPath('error.detalles.ruc.0', 'El RUC no es válido. Revisa los 11 dígitos.');

        $this->postJson(self::CENTRAL.'registro', $this->form(['slug' => 'admin']))
            ->assertConflict()
            ->assertJsonPath('error.codigo', 'SUBDOMINIO_NO_DISPONIBLE');

        Mail::assertNothingOutgoing();
    }

    public function test_a_ruc_can_use_the_trial_only_once(): void
    {
        $this->postJson(self::CENTRAL.'registro', $this->form());
        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $this->sentToken()]);

        $this->postJson(self::CENTRAL.'registro', $this->form(['slug' => 'otra-casona', 'correo' => 'otro@correo.pe']))
            ->assertConflict()
            ->assertJsonPath('error.codigo', 'RUC_YA_REGISTRADO');
    }

    public function test_link_cannot_be_reused_or_used_after_expiring(): void
    {
        $this->postJson(self::CENTRAL.'registro', $this->form());
        $token = $this->sentToken();

        $this->travel(25)->hours();
        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $token])
            ->assertStatus(410)
            ->assertJsonPath('error.codigo', 'ENLACE_VENCIDO');

        $this->travelBack();
        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $token])->assertOk();
        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $token])
            ->assertNotFound()
            ->assertJsonPath('error.codigo', 'ENLACE_INVALIDO');
    }

    public function test_expired_trial_blocks_the_panel_but_keeps_the_profile(): void
    {
        $this->postJson(self::CENTRAL.'registro', $this->form());
        $this->postJson(self::CENTRAL.'registro/verificar', ['token' => $this->sentToken()]);

        $tenant = Tenant::where('slug', 'lacasona')->firstOrFail();
        $context = $this->app->make(TenantContext::class);
        $context->set($tenant);
        Subscription::query()->update(['fecha_inicio' => today()->subDays(8), 'fecha_vencimiento' => today()->subDay()]);
        $context->clear();

        $token = $this->postJson($this->tenantUrl('lacasona', 'auth/login'), [
            'correo' => 'ana@lacasona.pe',
            'contrasena' => 'contrasena-segura',
        ])->json('data.token');

        $this->withToken($token)->getJson($this->tenantUrl('lacasona', 'panel/resumen'))
            ->assertStatus(402)
            ->assertJsonPath('error.codigo', 'PRUEBA_VENCIDA');

        $this->withToken($token)->getJson($this->tenantUrl('lacasona', 'auth/yo'))
            ->assertOk()
            ->assertJsonPath('data.inquilino.prueba.vencida', true);
    }

    private function form(array $overrides = []): array
    {
        return $overrides + [
            'ruc' => '20000000001',
            'razon_social' => 'LA CASONA S.A.C.',
            'nombre_comercial' => 'La Casona',
            'slug' => 'lacasona',
            'nombre_contacto' => 'Ana Torres',
            'correo' => 'ana@lacasona.pe',
            'telefono' => '987654321',
            'contrasena' => 'contrasena-segura',
            'contrasena_confirmation' => 'contrasena-segura',
        ];
    }

    private function sentToken(): string
    {
        $url = null;
        Mail::assertQueued(VerifyTrialMail::class, function (VerifyTrialMail $mail) use (&$url) {
            $url = $mail->url;

            return true;
        });

        parse_str(parse_url($url, PHP_URL_QUERY), $query);

        return $query['token'];
    }
}
