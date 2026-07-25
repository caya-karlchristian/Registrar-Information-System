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
php artisan migrate --force || true

# Clear and cache config
php artisan optimize

# Fix permissions on any files uploaded before the umask patch.
# New uploads will be created with correct permissions via umask=0022 in www.conf.
find /var/www/html/storage/app/public -type f -exec chmod 644 {} \;
find /var/www/html/storage/app/public -type d -exec chmod 755 {} \;

# Re-assert ownership on storage/ and bootstrap/cache/ right before php-fpm
# starts. Everything above this line (migrate, optimize, etc.) runs as root
# — the container's default user, since no USER directive drops privileges
# before this script runs. If any of those commands write a log line, they
# recreate storage/logs/laravel.log owned by root, and every future write
# from php-fpm (which runs as www-data per www.conf) then fails with
# "Permission denied" — permanently, until someone manually chowns it again.
# The Dockerfile's build-time chown only protects the first boot; this line
# makes every container start self-healing instead.
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Start PHP-FPM in background
umask 0022
php-fpm -D

# Start Nginx in foreground (queue worker runs in the dedicated ris_worker container)
nginx -g "daemon off;"