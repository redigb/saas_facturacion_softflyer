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
            'contrasena_temporal' => $result['contrasena_temporal'],
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
