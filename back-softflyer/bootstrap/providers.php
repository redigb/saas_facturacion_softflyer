<?php

use App\Core\Tenancy\Infrastructure\TenancyServiceProvider;
use App\Providers\AppServiceProvider;
use App\Shared\Infrastructure\ContextServiceProvider;

return [
    AppServiceProvider::class,
    ContextServiceProvider::class,
    TenancyServiceProvider::class,
];
