# API Laravel para probar Softflyer en cualquier equipo (docker-compose.yml en la raíz).
# PHP 8.3 (la misma versión del desarrollo local) con las extensiones de Greenter, PostgreSQL y Reverb.
FROM php:8.3-cli-bookworm

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions pdo_pgsql intl zip soap bcmath gd pcntl opcache

WORKDIR /app

# Dependencias primero: si solo cambia el código, Docker reutiliza esta capa.
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader

COPY . .
# .env vacío: la configuración llega por variables de docker-compose, pero `artisan test` busca el archivo.
RUN composer dump-autoload --optimize \
    && touch .env \
    && chmod +x docker/entrypoint.sh \
    && chown -R www-data:www-data /app

USER www-data

EXPOSE 8000 8080
ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["api"]
