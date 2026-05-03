<?php

namespace App\Providers;

use App\Contracts\DocumentRequestServiceInterface;
use App\Contracts\NotificationServiceInterface;
use App\Services\DocumentRequestService;
use App\Services\NotificationService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register interface → concrete-class bindings.
     *
     * Controllers and services depend on the interfaces (left-hand side).
     * Laravel's container resolves them to the concrete classes (right-hand side).
     * To swap an implementation — e.g. a fake notification service for tests —
     * change only this file; no controller or service needs to change.
     */
    public function register(): void
    {
        $this->app->bind(
            DocumentRequestServiceInterface::class,
            DocumentRequestService::class,
        );

        $this->app->bind(
            NotificationServiceInterface::class,
            NotificationService::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
