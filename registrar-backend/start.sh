#!/bin/bash

set -e

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

# Start Nginx in foreground
nginx -g "daemon off;"

until php artisan db:show > /dev/null 2>&1; do
  echo "Waiting for database..."; sleep 2
done
# DB is ready — now safe to migrate
php artisan migrate --force
