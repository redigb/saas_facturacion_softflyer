#!/bin/sh
# Primer arranque del contenedor de PostgreSQL: crea los roles y las bases de Softflyer
# con el mismo script del desarrollo local (back-softflyer/database/setup/crear_bd_local.sql).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v owner_pw="$SOFTFLYER_OWNER_PASSWORD" \
  -v app_pw="$SOFTFLYER_APP_PASSWORD" \
  -f /softflyer/crear_bd_local.sql
