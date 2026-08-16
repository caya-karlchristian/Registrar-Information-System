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

# Clear and cache config — but never in local dev. Caching bakes the
# current env vars (including APP_ENV) into bootstrap/cache/config.php,
# and once that cache exists Laravel reads config/env values from that
# frozen snapshot for the rest of the container's life — it stops
# consulting actual environment variables at all. That's harmless in
# prod/staging (env vars don't change without a redeploy anyway), but
# in local dev it's actively harmful: docker-compose.local.yml sets
# APP_ENV=local at container boot, so caching here permanently bakes
# in 'local', and no later override (e.g. `docker compose exec backend
# php artisan test`, which needs APP_ENV=testing) can ever take effect
# without an explicit config:clear — regardless of what phpunit.xml
# says. This previously caused LocalDevSeeder to run during `php
# artisan test` (its app()->environment('local') / runningUnitTests()
# guards both read the same poisoned cached value) and seed 4 fixed
# accounts into the test database, silently inflating count-based
# assertions in RoleAssignmentSearchTest, AlumniProvisioningTest, and
# UserProvisioningServiceTest. Local dev also doesn't need the
# performance win config caching exists for, since this compose file
# bind-mounts source for live reload anyway.
if [ "${APP_ENV:-}" != "local" ]; then
	php artisan optimize
fi

# Seed base reference data (roles, access_type, programs, policies,
# document_type, certificate_type, etc.) before LocalDevSeeder runs.
# Local dev uses a disposable MySQL volume, so unlike staging/prod —
# which already carry this data from real history and only ever run
# `php artisan migrate --force` in their deploy workflows — a fresh
# local database has empty reference tables after `migrate` alone.
# LocalDevSeeder assumes these rows already exist (e.g. it inserts
# users with role_id values that must already be present in `roles`,
# or the insert fails on the fk_users_role constraint). Every row
# DatabaseSeeder::run() writes goes through updateOrInsert, so this is
# safe and cheap to run on every local boot, not just the first one.
if [ "${APP_ENV:-}" = "local" ]; then
	php artisan db:seed --force
fi

# Seed the 4 fixed local dev accounts — local dev only, and invoked here
# rather than from DatabaseSeeder::run() on purpose. This script only runs
# at container boot, never during `php artisan test` (RefreshDatabase's
# `migrate:fresh --seed` calls DatabaseSeeder directly, in-process — it
# never re-execs start.sh). That makes this structurally safe regardless
# of how APP_ENV or any other env var resolves inside a test process; see
# DatabaseSeeder::run() for the full history of why an env-var guard
# inside the seeder itself wasn't reliable enough on its own.
if [ "${APP_ENV:-}" = "local" ]; then
	php artisan db:seed --class="Database\\Seeders\\LocalDevSeeder" --force
fi

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