<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    protected $middleware = [
        \Fruitcake\Cors\HandleCors::class,
        \Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        \Illuminate\Foundation\Http\Middleware\TrimStrings::class,
        // Register our custom EncryptCookies globally so the 'token' cookie
        // is excluded from decryption on every request (web + api).
        // Without this, Laravel uses the default EncryptCookies which tries
        // to decrypt the plain-text Sanctum token cookie and throws
        // DecryptException → RuntimeException → caught as 403 in SsoCallbackController.
        \App\Http\Middleware\EncryptCookies::class,
    ];

    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Foundation\Http\Middleware\TrimStrings::class,
        ],

        'api' => [
            \App\Http\Middleware\AuthenticateFromCookie::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    protected $routeMiddleware = [
        'auth'     => \Illuminate\Auth\Middleware\Authenticate::class,
        'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
        'role'     => \App\Http\Middleware\RoleMiddleware::class,
    ];
}