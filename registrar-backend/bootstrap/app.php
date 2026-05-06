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
        // ── Cookie encryption exclusion ──────────────────────────────────────
        // The 'token' cookie holds a raw Sanctum token and must not be
        // decrypted by EncryptCookies. Exclusion is declared in:
        //   App\Http\Middleware\EncryptCookies  ($except = ['token'])
        // Laravel auto-discovers that class and uses it instead of the default.

        // ── Reverse-proxy trust ──────────────────────────────────────────────
        // The app runs behind an nginx TLS terminator.  Without this, Laravel
        // never sees X-Forwarded-Proto: https, so:
        //   • request()->secure() returns false
        //   • Secure cookies set by the backend are not sent back by the browser
        //     (browser rejects a non-Secure Set-Cookie over what it believes is
        //     plain HTTP), causing every /api/me call after login to return 401.
        //   • APP_URL-based helpers generate http:// URLs.
        $middleware->trustProxies(at: '*');

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