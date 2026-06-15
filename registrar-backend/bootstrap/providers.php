<?php

return [
    App\Providers\AppServiceProvider::class,
    ...(class_exists(\Laravel\Telescope\TelescopeServiceProvider::class) && app()->environment('production', 'local')
        ? [
            \Laravel\Telescope\TelescopeServiceProvider::class,
            \App\Providers\TelescopeServiceProvider::class,
          ]
        : []),
];