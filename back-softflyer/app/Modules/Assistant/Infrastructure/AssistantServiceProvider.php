<?php

namespace App\Modules\Assistant\Infrastructure;

use App\Modules\Assistant\Application\Contracts\AssistantModel;
use App\Modules\Assistant\Infrastructure\Gemini\GeminiAssistantModel;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/** Asistente IA (spec 040): proveedor del modelo y límites de uso por usuario/restaurante. */
class AssistantServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AssistantModel::class, GeminiAssistantModel::class);
    }

    public function boot(): void
    {
        RateLimiter::for('asistente', function (Request $request) {
            $key = ($request->user()?->id ?? 'anon').'|'.$request->getHost();

            return [
                Limit::perMinute(15)->by($key),
                Limit::perDay(150)->by($key),
            ];
        });
    }
}
