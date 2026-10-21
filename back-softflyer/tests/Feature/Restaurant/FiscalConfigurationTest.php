<?php

namespace Tests\Feature\Restaurant;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use App\Shared\Exceptions\BusinessException;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 017a/017b: configuración fiscal. El dueño solo la lee; certificado, clave SOL, tasa y Amazonía
 * los carga el backoffice (aquí se ejercita el servicio que usa, y en PlatformTest sus rutas).
 */
class FiscalConfigurationTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
    }

    public function test_status_starts_empty_and_only_the_admin_can_read_it(): void
    {
        $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertOk()
            ->assertJsonPath('data.certificado', null)
            ->assertJsonPath('data.tiene_clave_sol', false)
            ->assertJsonPath('data.entorno', 'BETA')
            ->assertJsonPath('data.listo_para_emitir', false)
            ->assertJsonPath('data.tasa_igv.codigo', 'GENERAL')
            ->assertJsonPath('data.tasa_igv.tasa', 18);

        $this->as($this->waiter, 'GET', 'configuracion-fiscal')->assertForbidden();
    }

    public function test_the_owner_has_no_way_to_change_billing_settings(): void
    {
        $branch = $this->as($this->admin, 'GET', 'sucursales')->json('data.0.id');

        // Ni siquiera el administrador del restaurante: estas rutas no existen para él.
        $this->as($this->admin, 'POST', 'configuracion-fiscal/certificado', [])->assertNotFound();
        $this->as($this->admin, 'PUT', 'configuracion-fiscal/credenciales-sol', ['usuario_sol' => 'MODDATOS', 'clave_sol' => 'moddatos'])->assertNotFound();
        $this->as($this->admin, 'PUT', 'configuracion-fiscal/tasa-igv', ['tasa_igv_id' => 1])->assertNotFound();
        $this->as($this->admin, 'GET', 'tasas-igv')->assertNotFound();
        $this->assertNull($this->asTenant(fn () => DB::table('empresas')->value('usuario_sol')));

        // El IGV de la sucursal tampoco viaja por la API del dueño: se ignora y no cambia nada.
        $this->as($this->admin, 'PATCH', "sucursales/{$branch}", ['exonerado_amazonia' => true, 'tasa_igv_id' => 1, 'nombre' => 'Local Centro'])->assertOk()
            ->assertJsonPath('data.nombre', 'Local Centro')
            ->assertJsonPath('data.exonerado_amazonia', false);
        $this->assertFalse((bool) $this->asTenant(fn () => DB::table('sucursales')->where('id', $branch)->value('exonerado_amazonia')));
    }

    public function test_the_owner_keeps_the_product_affectation(): void
    {
        $product = $this->as($this->admin, 'GET', 'productos')->json('data.0');
        $other = $this->as($this->admin, 'GET', 'carta/catalogos')->json('data.tipos_afectacion_igv.1.id');

        $this->as($this->admin, 'PATCH', "productos/{$product['id']}", ['tipo_afectacion_igv_id' => $other])->assertOk();
    }

    public function test_certificate_is_stored_encrypted_and_secrets_never_come_back(): void
    {
        [$pfx, $password] = $this->makePfx(daysValid: 365);

        $this->importCertificate($pfx, $password);
        $response = $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertOk()
            ->assertJsonPath('data.certificado.titular', 'EMPRESA DE PRUEBA SAC')
            ->assertJsonPath('data.certificado.vigente', true);

        $this->assertStringNotContainsString('PRIVATE KEY', $response->getContent());
        $this->assertStringNotContainsString($password, $response->getContent());

        $stored = $this->asTenant(fn () => DB::table('certificados_digitales')->where('es_activo', true)->value('pem_cifrado'));
        $this->assertStringNotContainsString('PRIVATE KEY', $stored);
        $this->assertStringContainsString('PRIVATE KEY', decrypt($stored, false));

        // Subir otro certificado deja uno solo activo y conserva el anterior como historial.
        [$other, $otherPassword] = $this->makePfx(daysValid: 200);
        $this->importCertificate($other, $otherPassword);
        $this->assertSame(1, $this->asTenant(fn () => DB::table('certificados_digitales')->where('es_activo', true)->count()));
        $this->assertSame(2, $this->asTenant(fn () => DB::table('certificados_digitales')->count()));
    }

    public function test_a_pem_certificate_works_too(): void
    {
        [$pfx, $password] = $this->makePfx(daysValid: 365);
        openssl_pkcs12_read($pfx, $parts, $password);

        $this->importCertificate($parts['pkey'].$parts['cert'], '');

        $this->assertSame('PEM', $this->asTenant(fn () => DB::table('certificados_digitales')->where('es_activo', true)->value('formato_origen')));
    }

    public function test_wrong_password_garbage_and_expired_certificates_are_rejected(): void
    {
        [$pfx] = $this->makePfx(daysValid: 365);
        $this->assertCertificateRejected($pfx, 'otra-clave', 'CERTIFICADO_INVALIDO');
        $this->assertCertificateRejected('esto no es un certificado', 'x', 'CERTIFICADO_INVALIDO');

        [$expired, $password] = $this->makePfx(daysValid: 365, expired: true);
        $this->assertCertificateRejected($expired, $password, 'CERTIFICADO_VENCIDO');

        $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertJsonPath('data.certificado', null);
    }

    public function test_sol_password_is_encrypted_and_never_returned(): void
    {
        $this->asTenant(fn () => app(ManageFiscalConfiguration::class)->saveSolCredentials('MODDATOS', 'secreta1234'));

        $response = $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertOk()
            ->assertJsonPath('data.usuario_sol', 'MODDATOS')
            ->assertJsonPath('data.tiene_clave_sol', true)
            ->assertJsonMissingPath('data.clave_sol');
        $this->assertStringNotContainsString('secreta1234', $response->getContent());

        $stored = $this->asTenant(fn () => DB::table('empresas')->value('clave_sol_cifrada'));
        $this->assertStringNotContainsString('secreta1234', $stored);
        $this->assertSame('secreta1234', decrypt($stored, false));
    }

    public function test_company_is_ready_to_issue_only_with_certificate_sol_and_valid_ruc(): void
    {
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20100070970'])->assertOk();
        [$pfx, $password] = $this->makePfx(daysValid: 365);

        $this->importCertificate($pfx, $password);
        $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertJsonPath('data.listo_para_emitir', false);

        $this->asTenant(fn () => app(ManageFiscalConfiguration::class)->saveSolCredentials('MODDATOS', 'moddatos'));
        $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertJsonPath('data.listo_para_emitir', true);
    }

    public function test_rates_come_from_the_catalog_and_a_branch_can_have_its_own(): void
    {
        $fiscal = fn () => app(ManageFiscalConfiguration::class);
        $general = $this->asTenant(fn () => $fiscal()->rates())[0]['id'];

        $this->asTenant(fn () => $fiscal()->chooseRate($general));
        $this->as($this->admin, 'GET', 'configuracion-fiscal')->assertJsonPath('data.tasa_igv.id', $general);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $this->asTenant(fn () => $fiscal()->chooseRate(99999));
    }

    private function importCertificate(string $contents, string $password): void
    {
        $this->asTenant(fn () => app(ManageFiscalConfiguration::class)->importCertificate($contents, $password));
    }

    private function assertCertificateRejected(string $contents, string $password, string $code): void
    {
        try {
            $this->importCertificate($contents, $password);
            $this->fail('Se aceptó un certificado inválido.');
        } catch (BusinessException $e) {
            $this->assertSame($code, $e->codigo);
        }
    }

    /** @return array{0: string, 1: string} PFX y su contraseña. */
    private function makePfx(int $daysValid, bool $expired = false): array
    {
        $config = $this->opensslConfig();
        $key = openssl_pkey_new($config + ['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'EMPRESA DE PRUEBA SAC'], $key, $config);
        $certificate = openssl_csr_sign($csr, null, $key, $expired ? 0 : $daysValid, $config);
        openssl_pkcs12_export($certificate, $pfx, $key, 'clave-pfx');

        return [$pfx, 'clave-pfx'];
    }

    /** En Windows OpenSSL necesita un openssl.cnf; en Linux/CI no hace falta. */
    private function opensslConfig(): array
    {
        $candidates = array_filter([getenv('OPENSSL_CONF') ?: null, 'C:/laragon/bin/apache/httpd-2.4.54-win64-VS16/conf/openssl.cnf']);
        foreach ($candidates as $path) {
            if (is_file($path)) {
                return ['config' => $path];
            }
        }

        return [];
    }
}
