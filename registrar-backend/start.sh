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

# -----------------------------------------------------------------------
# Queue Worker (supervised restart loop)
# -----------------------------------------------------------------------
# Runs in the background so PHP-FPM + Nginx can still start normally.
# --sleep 3     : poll interval when queue is empty (seconds)
# --tries 3     : max attempts per job before marking it failed
# --timeout 120 : kill worker if a single job takes longer than 2 min
# --max-time 3600: recycle the worker process every hour to prevent
#                  memory creep (Laravel's recommended best practice)
# The while loop auto-restarts the worker if it exits for any reason.
# -----------------------------------------------------------------------
(
  while true; do
    php artisan queue:work \
      --sleep=3 \
      --tries=3 \
      --timeout=120 \
      --max-time=3600 \
      --queue=default 2>&1 | \
    tee -a /var/log/laravel-worker.log
    echo "[queue-worker] Process exited, restarting in 5s..." >&2
    sleep 5
  done
) &

# Start Nginx in foreground
nginx -g "daemon off;"

until php artisan db:show > /dev/null 2>&1; do
  echo "Waiting for database..."; sleep 2
done
# DB is ready — now safe to migrate
php artisan migrate --force
