#!/bin/bash

# Run migrations
php artisan migrate --force

# Clear and cache config
php artisan optimize

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
