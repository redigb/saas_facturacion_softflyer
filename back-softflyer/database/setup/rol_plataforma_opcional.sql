-- OPCIONAL. No se ejecuta automaticamente: requiere aprobacion explicita del dueno.
--
-- Hoy el backoffice lee cada restaurante entrando a su contexto RLS uno por uno
-- (app/Platform/Application/ClientDirectory.php). Es seguro y alcanza para cientos
-- de clientes. Con miles, conviene un rol de SOLO LECTURA que lea todos de una vez
-- (patron del Doc. 06 §1.2). Ejecutar como `postgres`:
--
--   psql -h 127.0.0.1 -U postgres -v plataforma_pw="..." -f database/setup/rol_plataforma_opcional.sql
--
-- BYPASSRLS le permite ignorar el aislamiento entre inquilinos; por eso solo recibe
-- SELECT sobre columnas concretas y nunca contrasenas, certificados ni claves SOL.

CREATE ROLE softflyer_plataforma LOGIN PASSWORD :'plataforma_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;

\connect factura_softfly
GRANT USAGE ON SCHEMA public TO softflyer_plataforma;
GRANT SELECT ON inquilinos, planes, suscripciones, uso_inquilino, registros_prueba TO softflyer_plataforma;
GRANT SELECT (id, inquilino_id, ruc, razon_social, nombre_comercial, homologado, eliminado_en) ON empresas TO softflyer_plataforma;
GRANT SELECT (id, inquilino_id, nombre, correo, es_activo, creado_en, eliminado_en) ON usuarios TO softflyer_plataforma;
GRANT SELECT (id, inquilino_id, eliminado_en) ON sucursales, productos TO softflyer_plataforma;
GRANT SELECT (id, inquilino_id) ON mesas TO softflyer_plataforma;
