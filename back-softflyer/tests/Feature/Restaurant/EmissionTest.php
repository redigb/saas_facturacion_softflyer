<?php

namespace Tests\Feature\Restaurant;

use App\Core\Billing\Application\ManageFiscalConfiguration;
use App\Core\Billing\Application\SubmitReceipt;
use App\Core\Billing\Application\SunatAuthFailed;
use App\Core\Billing\Application\SunatGateway;
use App\Core\Billing\Application\SunatResponse;
use App\Core\Billing\Application\SunatUnavailable;
use App\Core\Billing\Infrastructure\Greenter\ReceiptGreenterMapper;
use App\Core\Billing\Infrastructure\Jobs\SendReceiptJob;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Infrastructure\Persistence\Company;
use App\Platform\Application\ClientDirectory;
use Greenter\See;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Illuminate\Validation\ValidationException;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/**
 * Spec 017b: emisión real con Greenter (specs/017b-emision-greenter). SUNAT se reemplaza por un
 * doble: aquí se prueba lo nuestro, no el servicio de SUNAT.
 */
class EmissionTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cashier;

    private int $cashMethod;

    /** @var object{calls: int, next: callable} */
    private object $sunat;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->buildRestaurant();
        $this->cashier = $this->user('Cajero', 'caja@donjose.pe');
        $this->cashMethod = (int) DB::table('metodos_pago')->where('codigo', 'EFECTIVO')->value('id');
        $this->as($this->cashier, 'POST', 'sesiones-caja', ['monto_apertura' => 0])->assertCreated();

        $this->sunat = new class
        {
            public int $calls = 0;

            public int $cdrCalls = 0;

            public $next;

            public $cdr;
        };
        $this->sunat->next = fn () => new SunatResponse(Receipt::ACCEPTED, '0', 'La Factura numero B001-1, ha sido aceptada', '<xml/>', 'ZIPDATA', 'HASH=');
        $this->sunat->cdr = fn () => null;
        $sunat = $this->sunat;
        $this->app->bind(SunatGateway::class, fn () => new class($sunat) implements SunatGateway
        {
            public function __construct(private readonly object $sunat) {}

            public function send(Receipt $receipt): SunatResponse
            {
                $this->sunat->calls++;

                return ($this->sunat->next)();
            }

            public function checkCredentials(Company $company): string
            {
                return self::CREDENTIALS_OK;
            }

            public function cdr(Receipt $receipt): ?SunatResponse
            {
                $this->sunat->cdrCalls++;

                return ($this->sunat->cdr)();
            }
        });
    }

    public function test_a_configured_company_issues_a_real_receipt_that_sunat_accepts(): void
    {
        $this->configureCompany();

        $receipt = $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 2]]), 12)
            ->assertCreated()->json('data.comprobante');

        $this->assertFalse($receipt['es_simulado']);
        $row = DB::table('comprobantes')->first();
        $this->assertSame('ACEPTADO', $row->estado);
        $this->assertSame(1, $row->intentos_envio);
        $this->assertSame('HASH=', $row->hash_firma);
        $this->assertSame('0', $row->codigo_respuesta_sunat);
        Storage::disk('local')->assertExists($row->ruta_xml);
        Storage::disk('local')->assertExists($row->ruta_cdr);

        $line = DB::table('detalle_comprobantes')->first();
        $this->assertSame('Pan al ajo', $line->descripcion);
        $this->assertSame('5.085000', $line->valor_unitario);
        $this->assertSame('6.000000', $line->precio_unitario);
        $this->assertSame('10.17', $line->valor_venta);
        $this->assertSame('1.83', $line->igv);
    }

    public function test_an_unconfigured_company_stays_simulated_and_never_goes_to_sunat(): void
    {
        Queue::fake();

        $receipt = $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)
            ->assertCreated()->json('data.comprobante');

        $this->assertTrue($receipt['es_simulado']);
        $this->assertSame('EMITIDO', DB::table('comprobantes')->value('estado'));
        Queue::assertNothingPushed();

        $model = Receipt::firstOrFail();
        app(SubmitReceipt::class)->handle($model);
        $this->assertSame(0, $this->sunat->calls);
    }

    public function test_the_cashier_is_not_blocked_when_sunat_is_down_and_the_sweeper_retries_on_its_own(): void
    {
        $this->configureCompany();
        Queue::fake();

        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();
        Queue::assertPushed(SendReceiptJob::class, 1);
        $this->assertSame('PENDIENTE_ENVIO', DB::table('comprobantes')->value('estado'));

        $this->sunat->next = fn () => throw new SunatUnavailable('SUNAT respondió 0109: servicio no disponible');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('PENDIENTE_ENVIO', $row->estado);
        $this->assertSame('SUNAT_CAIDO', $row->motivo_espera);
        $this->assertSame(1, $row->intentos_envio);
        $this->assertStringContainsString('0109', $row->ultimo_error_tecnico);
        $this->assertNotNull($row->proximo_intento_en);

        // Tras la caída todo envío espera un momento; pasado el plazo, el barrendero lo encola solo.
        Queue::fake();
        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('pausa')->assertSuccessful();
        Queue::assertNothingPushed();

        Cache::forget(SubmitReceipt::PAUSE_KEY);
        $this->travel(31)->seconds();
        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('encolados: 1')->assertSuccessful();
        Queue::assertPushed(SendReceiptJob::class, 1);

        // SUNAT vuelve: el siguiente intento lo deja aceptado y limpia el motivo.
        $this->sunat->next = fn () => new SunatResponse(Receipt::ACCEPTED, '0', 'Aceptada', '<xml/>', 'ZIP', 'H=');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('ACEPTADO', $row->estado);
        $this->assertSame(2, $row->intentos_envio);
        $this->assertNull($row->ultimo_error_tecnico);
        $this->assertNull($row->motivo_espera);
    }

    public function test_an_ambiguous_cut_asks_sunat_for_the_cdr_before_resending(): void
    {
        $this->pendingReceipt();

        $this->sunat->next = fn () => throw new SunatUnavailable('Fallo de conexión con SUNAT: timeout', true);
        $this->submit();
        $this->assertSame('VERIFICAR', $this->receipt()->motivo_espera);

        // SUNAT sí lo había recibido: se recupera su CDR y no se vuelve a enviar.
        $this->sunat->cdr = fn () => new SunatResponse(Receipt::ACCEPTED, '0', 'Aceptada', '', 'ZIP');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('ACEPTADO', $row->estado);
        $this->assertSame(1, $this->sunat->calls);
        $this->assertSame(1, $this->sunat->cdrCalls);
        Storage::disk('local')->assertExists($row->ruta_cdr);
    }

    public function test_a_receipt_sunat_already_has_recovers_its_cdr_instead_of_being_resent(): void
    {
        $this->pendingReceipt();

        $this->sunat->next = fn () => new SunatResponse(SunatResponse::REGISTERED, '1033', 'El comprobante ya fue informado', '<xml/>', null, 'HASH=');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('PENDIENTE_ENVIO', $row->estado);
        $this->assertSame('CDR_PENDIENTE', $row->motivo_espera);
        $this->assertNotNull($row->registrado_en);
        $this->assertSame(1, $this->sunat->cdrCalls);   // consulta de inmediato

        $this->travel(2)->minutes();
        $this->sunat->cdr = fn () => new SunatResponse(Receipt::ACCEPTED, '0', 'Aceptada', '', 'ZIP');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('ACEPTADO', $row->estado);
        $this->assertSame(1, $this->sunat->calls);      // nunca se reenvía
        $this->assertNull($row->motivo_espera);
        Storage::disk('local')->assertExists($row->ruta_xml);
        Storage::disk('local')->assertExists($row->ruta_cdr);
    }

    public function test_cdr_polling_slows_down_and_stops_after_48_hours(): void
    {
        $this->assertSame(60, SubmitReceipt::cdrDelaySeconds(30));
        $this->assertSame(600, SubmitReceipt::cdrDelaySeconds(1200));
        $this->assertSame(3600, SubmitReceipt::cdrDelaySeconds(7200));
        $this->assertSame(10800, SubmitReceipt::cdrDelaySeconds(90000));

        $this->pendingReceipt();
        $this->sunat->next = fn () => new SunatResponse(SunatResponse::REGISTERED, '1033', 'Ya informado', '<xml/>');
        $this->submit();
        $this->assertSame('CDR_PENDIENTE', $this->receipt()->motivo_espera);

        $this->travel(30)->hours();
        $this->submit();   // sigue sin CDR: reprograma cada 3 h
        $this->assertSame('CDR_PENDIENTE', $this->receipt()->motivo_espera);
        $this->assertEqualsWithDelta(10800, now()->diffInSeconds($this->receipt()->proximo_intento_en, false), 5);

        $this->travel(19)->hours();
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('SIN_CDR', $row->estado);
        $this->assertNull($row->proximo_intento_en);
        $this->assertSame(1, $this->sunat->calls);
    }

    public function test_bad_credentials_pause_the_receipt_until_they_are_fixed(): void
    {
        $this->pendingReceipt();

        $this->sunat->next = fn () => throw new SunatAuthFailed('SUNAT respondió 0102: usuario o contraseña incorrectos');
        $this->submit();

        $row = $this->receipt();
        $this->assertSame('CREDENCIALES', $row->motivo_espera);
        $this->assertNull($row->proximo_intento_en);

        $this->travel(5)->hours();
        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('encolados: 0')->assertSuccessful();

        // Softflyer corrige la clave SOL: el comprobante vuelve a la cola de inmediato.
        $this->asTenant(fn () => app(ManageFiscalConfiguration::class)->saveSolCredentials('MODDATOS', 'moddatos'));
        $row = $this->receipt();
        $this->assertNull($row->motivo_espera);
        $this->assertNotNull($row->proximo_intento_en);
        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('encolados: 1')->assertSuccessful();
    }

    public function test_the_backoffice_alerts_list_what_needs_attention_and_ignore_simulated_receipts(): void
    {
        $directory = fn () => app(ClientDirectory::class)->alerts();
        $submitReal = fn () => $this->asTenant(fn () => app(SubmitReceipt::class)->handle(Receipt::where('es_simulado', false)->firstOrFail()));

        $this->chargeBread();   // simulado: no genera alertas
        $this->assertSame([], $directory());

        $this->pendingReceipt();
        $this->assertSame([], $directory());   // recién emitido, aún dentro de su hora

        $this->sunat->next = fn () => throw new SunatAuthFailed('SUNAT respondió 0102');
        $submitReal();
        $alerts = $directory();
        $this->assertSame(['CREDENCIALES'], array_column($alerts, 'tipo'));
        $this->assertSame(['donjose', 'alta', 1], [$alerts[0]['slug'], $alerts[0]['severidad'], $alerts[0]['cantidad']]);
        $this->assertSame('B001-2', $alerts[0]['comprobantes'][0]['numero'] ?? null);
        $this->assertStringContainsString('0102', $alerts[0]['comprobantes'][0]['error']);

        $this->travel(49)->hours();
        $this->asTenant(fn () => DB::table('comprobantes')->where('es_simulado', false)->update(['motivo_espera' => null]));
        $submitReal();
        $this->assertSame(['VENCIDO'], array_column($directory(), 'tipo'));
    }

    public function test_a_receipt_that_could_not_be_reported_in_time_expires(): void
    {
        $this->pendingReceipt();

        $this->travel(49)->hours();
        $this->submit();

        $this->assertSame('VENCIDO', $this->receipt()->estado);
        $this->assertSame(0, $this->sunat->calls);
    }

    public function test_the_sweeper_rescues_a_receipt_whose_job_never_ran(): void
    {
        $this->pendingReceipt();

        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('encolados: 0')->assertSuccessful();   // recién emitido: su Job aún puede estar en cola

        $this->travel(3)->minutes();
        $this->artisan('softflyer:enviar-pendientes')->expectsOutputToContain('encolados: 1')->assertSuccessful();
        Queue::assertPushed(SendReceiptJob::class, 2);
    }

    public function test_sol_credentials_are_checked_before_they_are_saved(): void
    {
        $this->configureCompany();

        foreach ([
            ['MODDATOS', 'corta', 'clave_sol'],
            ['MODDATOS', 'una-clave-demasiado-larga', 'clave_sol'],
            ['20100070970MODDATOS', 'moddatos', 'usuario_sol'],
            ['MOD DATOS', 'moddatos', 'usuario_sol'],
        ] as [$user, $password, $field]) {
            try {
                $this->asTenant(fn () => app(ManageFiscalConfiguration::class)->saveSolCredentials($user, $password));
                $this->fail("Se aceptó {$user} / {$password}");
            } catch (ValidationException $e) {
                $this->assertArrayHasKey($field, $e->errors());
            }
        }
    }

    public function test_rejected_and_observed_answers_are_recorded_without_retrying(): void
    {
        $this->configureCompany();

        $this->sunat->next = fn () => new SunatResponse(Receipt::REJECTED, '2800', 'El RUC del receptor no existe', '<xml/>');
        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();
        $rejected = DB::table('comprobantes')->first();
        $this->assertSame('RECHAZADO', $rejected->estado);
        $this->assertSame('2800', $rejected->codigo_respuesta_sunat);
        $this->assertNull($rejected->ruta_cdr);

        $this->sunat->next = fn () => new SunatResponse(Receipt::OBSERVED, '0', 'Aceptada con observaciones 4252', '<xml/>', 'ZIP');
        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();
        $this->assertSame('OBSERVADO', DB::table('comprobantes')->orderByDesc('id')->value('estado'));
        $this->assertSame(2, $this->sunat->calls);
    }

    public function test_an_amazonia_branch_sells_exonerated_with_its_legend_and_inafecto_stays_inafecto(): void
    {
        $this->configureCompany();

        $this->asTenant(fn () => DB::table('sucursales')->update(['exonerado_amazonia' => true]));
        $exonerated = $this->chargeBread();
        $this->assertSame('0.00', $exonerated->op_gravada);
        $this->assertSame('6.00', $exonerated->op_exonerada);
        $this->assertSame('0.00', $exonerated->igv);
        $this->assertSame('2001', $exonerated->leyenda_codigo);
        $this->assertSame('20', DB::table('tipos_afectacion_igv')->where('id', DB::table('detalle_comprobantes')->value('tipo_afectacion_igv_id'))->value('codigo'));
        $this->assertSame(['1000', '2001'], $this->legendCodes());

        // Un local de servicios usa la 2002.
        $this->asTenant(fn () => DB::table('sucursales')->update(['leyenda_amazonia' => '2002']));
        $this->assertSame('2002', $this->chargeBread()->leyenda_codigo);

        // Lo inafecto nunca pasa a exonerado, ni siquiera en la Amazonía, y sin lo exonerado no hay leyenda.
        $inafecto = DB::table('tipos_afectacion_igv')->where('codigo', '30')->value('id');
        $this->asTenant(fn () => DB::table('productos')->where('id', $this->ids['pan'])->update(['tipo_afectacion_igv_id' => $inafecto]));
        $third = $this->chargeBread();
        $this->assertSame('6.00', $third->op_inafecta);
        $this->assertSame('0.00', $third->op_exonerada);
        $this->assertNull($third->leyenda_codigo);
        $this->assertSame(['1000'], $this->legendCodes());
    }

    public function test_the_branch_rate_overrides_the_company_rate_and_a_gravado_branch_has_no_legend(): void
    {
        $this->configureCompany();

        $normal = $this->chargeBread();
        $this->assertSame('5.08', $normal->op_gravada);
        $this->assertSame('0.92', $normal->igv);
        $this->assertNull($normal->leyenda_codigo);

        // Una tasa reducida solo en esta sucursal; la empresa sigue en 18 %. Se crea con el dueño del esquema (catálogo global).
        // Se borra al terminar la prueba, ya deshecha su transacción: antes, el borrado esperaría la fila de sucursales aún sin confirmar.
        $owner = DB::connection('pgsql_owner');
        $owner->table('tasas_igv')->where('codigo', 'REDUCIDA_PRUEBA')->delete();
        $reduced = (int) $owner->table('tasas_igv')->insertGetId(['codigo' => 'REDUCIDA_PRUEBA', 'nombre' => 'Tasa reducida (prueba)', 'tasa' => 10, 'vigente_desde' => '2020-01-01']);
        $this->beforeApplicationDestroyed(fn () => $owner->table('tasas_igv')->where('id', $reduced)->delete());

        $this->asTenant(fn () => DB::table('sucursales')->update(['tasa_igv_id' => $reduced]));

        $second = $this->chargeBread();
        $this->assertSame('5.45', $second->op_gravada);
        $this->assertSame('0.55', $second->igv);
        $this->assertStringContainsString('<cbc:Percent>10</cbc:Percent>', $this->asTenant(fn () => $this->signedXml()));
    }

    public function test_a_boleta_of_700_or_more_needs_the_customer_dni_only_when_real(): void
    {
        $order = $this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 120]]);
        $this->charge($order, 720)->assertCreated();   // simulada: no aplica la regla
        $this->assertSame(1, DB::table('comprobantes')->count());

        $this->configureCompany();
        $big = $this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 120]], 'm2');

        $this->charge($big, 720)->assertStatus(422)->assertJsonValidationErrorFor('cliente.numero', 'error.detalles');
        $this->assertSame(1, DB::table('comprobantes')->count());

        $this->charge($big, 720, ['tipo_documento' => 'DNI', 'numero' => '45678912', 'nombre' => 'Ana Pérez'])->assertCreated();
        $this->assertSame(2, DB::table('comprobantes')->count());
    }

    public function test_the_mapper_builds_a_document_greenter_can_sign(): void
    {
        $this->configureCompany();
        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 2]]), 12, ['tipo_documento' => 'DNI', 'numero' => '45678912', 'nombre' => 'Ana Pérez'])->assertCreated();

        $xml = $this->asTenant(function () {
            $see = new See;
            $see->setCertificate(Crypt::decryptString(DB::table('certificados_digitales')->where('es_activo', true)->value('pem_cifrado')));
            $see->setService('http://localhost');

            return $see->getXmlSigned(app(ReceiptGreenterMapper::class)->invoice(Receipt::firstOrFail()));
        });

        $this->assertStringContainsString('<cbc:ID>B001-1</cbc:ID>', $xml);
        $this->assertStringContainsString('DOCE CON 00/100 SOLES', $xml);
        $this->assertStringContainsString('<cbc:ID schemeID="1">45678912</cbc:ID>', $xml);
        $this->assertStringContainsString('ds:Signature', $xml);
    }

    /** Cobra una venta real y deja su comprobante PENDIENTE_ENVIO sin enviar (la cola está simulada). */
    private function pendingReceipt(): void
    {
        $this->configureCompany();
        Queue::fake();
        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();
    }

    private function submit(): void
    {
        $this->asTenant(fn () => app(SubmitReceipt::class)->handle(Receipt::firstOrFail()));
    }

    private function receipt(): object
    {
        return $this->asTenant(fn () => DB::table('comprobantes')->first());
    }

    /** Certificado, SOL y RUC válido: la empresa queda lista para emitir de verdad. */
    private function configureCompany(): void
    {
        $this->as($this->admin, 'PATCH', 'empresa', ['ruc' => '20100070970'])->assertOk();
        [$pfx, $password] = $this->makePfx();
        // Como lo hace el backoffice: el dueño no tiene endpoints para esto.
        $this->asTenant(function () use ($pfx, $password) {
            app(ManageFiscalConfiguration::class)->importCertificate($pfx, $password);
            app(ManageFiscalConfiguration::class)->saveSolCredentials('MODDATOS', 'moddatos');
        });
    }

    /** Cobra un pan de S/ 6 (gravado) y devuelve el comprobante emitido. */
    private function chargeBread(): object
    {
        $this->charge($this->billedOrder([['producto_id' => $this->ids['pan'], 'cantidad' => 1]]), 6)->assertCreated();

        return DB::table('comprobantes')->orderByDesc('id')->first();
    }

    private function legendCodes(): array
    {
        preg_match_all('/languageLocaleID="(\d{4})"/', $this->asTenant(fn () => $this->signedXml()), $matches);

        return $matches[1];
    }

    private function signedXml(): string
    {
        $see = new See;
        $see->setCertificate(Crypt::decryptString(DB::table('certificados_digitales')->where('es_activo', true)->value('pem_cifrado')));
        $see->setService('http://localhost');

        return $see->getXmlSigned(app(ReceiptGreenterMapper::class)->invoice(Receipt::orderByDesc('id')->firstOrFail()));
    }

    private function billedOrder(array $items, string $table = 'm1'): int
    {
        $order = $this->open($this->ids[$table])->json('data.id');
        $this->send($order, $items)->assertCreated();
        $this->as($this->waiter, 'POST', "pedidos/{$order}/cuenta")->assertOk();

        return $order;
    }

    /** @param  array<string, string>|null  $customer */
    private function charge(int $order, float|int $amount, ?array $customer = null): TestResponse
    {
        $body = ['pagos' => [['metodo_pago_id' => $this->cashMethod, 'monto' => $amount]]] + ($customer ? ['cliente' => $customer] : []);

        return $this->as($this->cashier, 'POST', "pedidos/{$order}/cobro", $body, idempotent: true);
    }

    /** @return array{0: string, 1: string} */
    private function makePfx(): array
    {
        $config = $this->opensslConfig();
        $key = openssl_pkey_new($config + ['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'EMPRESA DE PRUEBA SAC'], $key, $config);
        $certificate = openssl_csr_sign($csr, null, $key, 365, $config);
        openssl_pkcs12_export($certificate, $pfx, $key, 'clave-pfx');

        return [$pfx, 'clave-pfx'];
    }

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
