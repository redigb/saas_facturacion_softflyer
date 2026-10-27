<?php

namespace App\Platform\Presentation\Controllers;

use App\Core\Tenancy\Application\RegisterTrial;
use App\Core\Tenancy\Domain\Ruc;
use App\Core\Tenancy\Infrastructure\Persistence\Plan;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\Persistence\TrialRegistration;
use App\Platform\Application\ClientDirectory;
use App\Platform\Application\ManageClient;
use App\Platform\Application\PlatformOverview;
use App\Platform\Infrastructure\Persistence\PlatformLog;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController
{
    public function __construct(private readonly ManageClient $manage) {}

    public function overview(PlatformOverview $overview): JsonResponse
    {
        return response()->json(['data' => $overview->handle()]);
    }

    public function index(ClientDirectory $directory): JsonResponse
    {
        return response()->json(['data' => $directory->all()]);
    }

    public function show(string $slug, ClientDirectory $directory): JsonResponse
    {
        return response()->json(['data' => $directory->find($this->client($slug))]);
    }

    public function plans(): JsonResponse
    {
        return response()->json(['data' => Plan::where('es_activo', true)->where('codigo', '!=', 'PRUEBA')
            ->orderBy('id')->get(['codigo', 'nombre', 'precio_mensual', 'max_sucursales', 'max_usuarios'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ruc' => ['required', 'digits:11', function (string $attribute, mixed $value, Closure $fail) {
                if (! Ruc::isValid($value)) {
                    $fail('El RUC no es válido.');
                }
            }],
            'razon_social' => ['required', 'string', 'max:255'],
            'nombre_comercial' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/'],
            'nombre_contacto' => ['required', 'string', 'max:120'],
            'correo' => ['required', 'email', 'max:255'],
            'plan' => ['required', 'string'],
            'meses' => ['required', 'integer', 'between:1,24'],
        ], [
            'slug.regex' => 'Usa solo letras minúsculas, números y guiones.',
            'meses.between' => 'Entre 1 y 24 meses.',
        ]);
        $data['correo'] = mb_strtolower($data['correo']);

        $result = $this->manage->create($data, $request->user());

        return response()->json(['data' => [
            'slug' => $result['tenant']->slug,
            'correo' => $data['correo'],
            'enlace_activacion' => $result['enlace_activacion'],
            'expira_en' => $result['expira_en'],
        ]], 201);
    }

    public function activatePlan(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['plan' => ['required', 'string'], 'meses' => ['required', 'integer', 'between:1,24']]);
        $this->manage->activatePlan($this->client($slug), $data['plan'], $data['meses'], $request->user());

        return $this->ok();
    }

    public function extendTrial(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['dias' => ['required', 'integer', 'between:1,30']]);
        $this->manage->extendTrial($this->client($slug), $data['dias'], $request->user());

        return $this->ok();
    }

    public function suspend(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['motivo' => ['required', 'string', 'max:255']], ['motivo.required' => 'Indica el motivo.']);
        $this->manage->suspend($this->client($slug), $data['motivo'], $request->user());

        return $this->ok();
    }

    public function reactivate(string $slug, Request $request): JsonResponse
    {
        $this->manage->reactivate($this->client($slug), $request->user());

        return $this->ok();
    }

    public function setHomologation(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['homologado' => ['required', 'boolean']]);
        $this->manage->setHomologation($this->client($slug), (bool) $data['homologado'], $request->user());

        return $this->ok();
    }

    public function uploadCertificate(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'certificado' => ['required', 'file', 'max:512'],
            'contrasena' => ['nullable', 'string', 'max:200'],
        ], ['certificado.required' => 'Sube el archivo del certificado.']);

        $this->manage->uploadCertificate($this->client($slug), $request->file('certificado')->getContent(), (string) ($data['contrasena'] ?? ''), $request->user());

        return $this->ok();
    }

    public function saveSolCredentials(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'usuario_sol' => ['required', 'string', 'min:3', 'max:30'],
            'clave_sol' => ['required', 'string', 'min:3', 'max:100'],
        ], ['usuario_sol.required' => 'Escribe el usuario SOL.', 'clave_sol.required' => 'Escribe la clave SOL.']);

        $this->manage->saveSolCredentials($this->client($slug), $data['usuario_sol'], $data['clave_sol'], $request->user());

        return $this->ok();
    }

    public function testCredentials(string $slug): JsonResponse
    {
        return response()->json(['data' => $this->manage->testCredentials($this->client($slug))]);
    }

    public function alerts(ClientDirectory $directory): JsonResponse
    {
        // Recorre todos los clientes: un minuto de caché basta para el contador del menú y la pantalla.
        return response()->json(['data' => Cache::remember('plataforma.alertas', 60, fn () => $directory->alerts())]);
    }

    public function setCompanyRate(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['tasa_igv_id' => ['required', 'integer']], ['tasa_igv_id.required' => 'Elige una tasa.']);
        $this->manage->setCompanyRate($this->client($slug), $data['tasa_igv_id'], $request->user());

        return $this->ok();
    }

    public function update(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'ruc' => ['sometimes', 'digits:11', function (string $attribute, mixed $value, Closure $fail) {
                if (! Ruc::isValid($value)) {
                    $fail('El RUC no es válido.');
                }
            }],
            'razon_social' => ['sometimes', 'string', 'max:255'],
            'nombre_comercial' => ['sometimes', 'string', 'max:120'],
            'direccion_fiscal' => ['sometimes', 'nullable', 'string', 'max:255'],
        ], ['ruc.digits' => 'El RUC tiene 11 dígitos.']);
        $this->manage->updateData($this->client($slug), $data, $request->user());

        return $this->ok();
    }

    public function cancel(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate(['motivo' => ['required', 'string', 'max:255']], ['motivo.required' => 'Indica el motivo de la baja.']);
        $this->manage->cancel($this->client($slug), $data['motivo'], $request->user());

        return $this->ok();
    }

    public function sendPasswordReset(string $slug, int $user, Request $request): JsonResponse
    {
        return response()->json(['data' => $this->manage->sendPasswordReset($this->client($slug), $user, $request->user())]);
    }

    public function setBranchTax(string $slug, int $branch, Request $request): JsonResponse
    {
        $data = $request->validate([
            'tasa_igv_id' => ['sometimes', 'nullable', 'integer'],
            'exonerado_amazonia' => ['sometimes', 'boolean'],
            'leyenda_amazonia' => ['sometimes', 'in:2001,2002'],
        ], ['leyenda_amazonia.in' => 'La leyenda es 2001 (bienes) o 2002 (servicios).']);
        $this->manage->setBranchTax($this->client($slug), $branch, $data, $request->user());

        return $this->ok();
    }

    public function pendingRegistrations(): JsonResponse
    {
        return response()->json(['data' => TrialRegistration::whereNull('verificado_en')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (TrialRegistration $r) => [
                'id' => $r->id,
                'ruc' => $r->ruc,
                'razon_social' => $r->razon_social,
                'nombre_comercial' => $r->nombre_comercial,
                'nombre_contacto' => $r->nombre_contacto,
                'correo' => $r->correo,
                'telefono' => $r->telefono,
                'enlace_vigente' => $r->token_expira_en?->isFuture() ?? false,
                'creado_en' => $r->creado_en->toIso8601ZuluString(),
            ])]);
    }

    public function resendLink(int $id, Request $request, RegisterTrial $registerTrial): JsonResponse
    {
        $registration = TrialRegistration::whereNull('verificado_en')->findOrFail($id);
        $registerTrial->sendVerification($registration);

        PlatformLog::create([
            'administrador_id' => $request->user()->id,
            'accion' => 'ENLACE_REENVIADO',
            'detalle' => ['correo' => $registration->correo, 'ruc' => $registration->ruc],
        ]);

        return $this->ok();
    }

    private function client(string $slug): Tenant
    {
        return Tenant::where('slug', $slug)->where('es_demo', false)->firstOrFail();
    }

    private function ok(): JsonResponse
    {
        return response()->json(['data' => ['ok' => true]]);
    }
}
