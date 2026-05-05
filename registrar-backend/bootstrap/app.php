<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ── Cookie → Bearer token bridge ────────────────────────────────────
        // Login stores the Sanctum token in an HttpOnly cookie named "token".
        // Sanctum's token guard only reads Authorization: Bearer headers, so
        // without this the cookie is invisible to Sanctum and every request
        // returns 401.  This middleware runs first on all API routes and
        // promotes the cookie value into the header so Sanctum finds it.
        $middleware->prependToGroup('api', \App\Http\Middleware\AuthenticateFromCookie::class);

        // ── Route middleware aliases ─────────────────────────────────────────
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        // ── Auth redirect behaviour ──────────────────────────────────────────
        // Return 401 JSON for API routes instead of redirecting to a login page.
        $middleware->redirectGuestsTo(function ($request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null; // null = throw AuthenticationException → 401
            }
            return '/';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            return true; // always return JSON, never HTML error pages
        });
    })->create();