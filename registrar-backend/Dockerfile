FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nginx

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy only dependency files first — this layer is cached until composer.json/lock changes
COPY composer.json composer.lock ./

# Install dependencies (cached as long as above files don't change)
RUN composer install --optimize-autoloader --no-scripts

# Copy the rest of the source FIRST, then patch vendor/.
# The patch must come AFTER COPY so it always runs on the final layer —
# if it ran before COPY, a cache hit on the COPY layer would silently
# restore the unpatched file.
COPY . .

# Patch laravel/reverb Router.php — operator precedence bug in isWebSocketRequest().
# The original code: $request->getHeader('Upgrade')[0] ?? null === 'websocket'
# evaluates as:      $request->getHeader('Upgrade')[0] ?? (null === 'websocket')
# which is always truthy (returns the header value, never the boolean comparison).
# This means WebSocket upgrade requests are never detected, so every connection
# is routed through the HTTP path and crashes with a type mismatch on the
# Connection argument. Fix: add parentheses so the null-coalesce feeds into ===.
# Remove this patch if/when laravel/reverb fixes it upstream.
RUN sed -i \
    "s/return \$request->getHeader('Upgrade')\[0\] ?? null === 'websocket';/return (\$request->getHeader('Upgrade')[0] ?? null) === 'websocket';/" \
    /var/www/html/vendor/laravel/reverb/src/Servers/Reverb/Http/Router.php

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy nginx config
COPY nginx.conf /etc/nginx/sites-available/default

# Expose port
EXPOSE 8000

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# At the end of your Dockerfile, BEFORE the CMD/ENTRYPOINT
RUN php artisan config:clear \
 && php artisan cache:clear \
 && php artisan route:clear \
 && php artisan view:clear

CMD ["/start.sh"]