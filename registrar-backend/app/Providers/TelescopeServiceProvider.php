<?php
namespace App\Providers;

use App\Models\SystemUser;
use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        $this->hideSensitiveRequestDetails();

        Telescope::filter(function (IncomingEntry $entry) {
            if ($this->app->environment('local')) {
                return true;
            }

            return $entry->isReportableException() ||
                   $entry->isFailedRequest()       ||
                   $entry->isFailedJob()           ||
                   $entry->isScheduledTask()       ||
                   $entry->hasMonitoredTag()       ||
                   $entry->type === 'request';
        });
    }

    protected function hideSensitiveRequestDetails(): void
    {
        if ($this->app->environment('local')) {
            return;
        }

        Telescope::hideRequestParameters(['_token', 'password', 'or_number']);
        Telescope::hideRequestHeaders([
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
            'authorization',
        ]);
    }

    protected function gate(): void
    {
        Gate::define('viewTelescope', function ($user = null) {
            if (!$user) {
                $user = auth('sanctum')->user();
            }
            
            return $user instanceof \App\Models\SystemUser 
                && $user->role_id === \App\Models\SystemUser::ROLE_SUPER_ADMIN;
        });
    }
}