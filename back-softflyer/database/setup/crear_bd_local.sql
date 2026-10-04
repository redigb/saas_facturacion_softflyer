-- Crea los roles y bases de datos locales de Softflyer. Ejecutar una sola vez como `postgres`:
--
--   psql -h 127.0.0.1 -U postgres -v owner_pw="..." -v app_pw="..." -f database/setup/crear_bd_local.sql
--
-- softflyer_owner: dueno del esquema, corre migraciones y seeders.
-- softflyer_app:   lo usa la API. No es superusuario ni tiene BYPASSRLS, asi RLS siempre aplica.

CREATE ROLE softflyer_owner LOGIN PASSWORD :'owner_pw';
CREATE ROLE softflyer_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

CREATE DATABASE factura_softfly OWNER softflyer_owner;
CREATE DATABASE factura_softfly_test OWNER softflyer_owner;

\connect factura_softfly
SET ROLE softflyer_owner;
GRANT USAGE ON SCHEMA public TO softflyer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO softflyer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO softflyer_app;

\connect factura_softfly_test
SET ROLE softflyer_owner;
GRANT USAGE ON SCHEMA public TO softflyer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO softflyer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO softflyer_app;
