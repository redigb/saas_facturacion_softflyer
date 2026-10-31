<?php

use App\Core\Tenancy\Infrastructure\TenancyServiceProvider;
use App\Modules\Assistant\Infrastructure\AssistantServiceProvider;
use App\Modules\Restaurant\Infrastructure\RestaurantServiceProvider;
use App\Providers\AppServiceProvider;
use App\Shared\Infrastructure\ContextServiceProvider;

return [
    AppServiceProvider::class,
    ContextServiceProvider::class,
    TenancyServiceProvider::class,
    RestaurantServiceProvider::class,
    AssistantServiceProvider::class,
];
