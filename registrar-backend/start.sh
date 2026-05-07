#!/bin/bash
set -euo pipefail

# Clear stale caches before anything else so config:cache picks up fresh values.
php artisan config:clear
php artisan cache:clear || true   
php artisan route:clear
php artisan view:clear

# Ensure the public storage symlink exists for assets served from /storage
if [ ! -L public/storage ] && [ ! -e public/storage ]; then
	php artisan storage:link || true
fi

# Run migrations
php artisan migrate --force

# Clear and cache config
php artisan optimize

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground (queue worker runs in the dedicated ris_worker container)
nginx -g "daemon off;"
