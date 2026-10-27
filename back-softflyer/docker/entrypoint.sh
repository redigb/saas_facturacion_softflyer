#!/bin/sh
# Un solo contenedor de la API con varios papeles: api | worker | scheduler | reverb.
set -e

case "$1" in
  api)
    # Solo el papel "api" prepara la base: los demás esperan a que esté sano (healthcheck).
    # Igual que en local (README): migra y siembra con el dueño del esquema. Los seeders son
    # idempotentes, así que reiniciar el contenedor no duplica datos.
    php artisan migrate --database=pgsql_owner --seed --force
    php artisan storage:link --force >/dev/null 2>&1 || true
    # --no-reload: sin el, serve descarta las variables del contenedor para releer el .env.
    exec php artisan serve --host=0.0.0.0 --port=8000 --no-reload
    ;;
  worker)
    exec php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    ;;
  scheduler)
    exec php artisan schedule:work
    ;;
  reverb)
    exec php artisan reverb:start --host=0.0.0.0 --port=8080
    ;;
  *)
    exec "$@"
    ;;
esac
