# Softflyer

> Un ERP SaaS multi-tenant para que los negocios peruanos vendan, controlen y facturen sin perder el ritmo de su operacion.

Softflyer nace como un nucleo empresarial reutilizable y crece mediante modulos verticales: restaurante, farmacia, hotel y otros. La primera meta es sencilla y exigente: una base clara, segura y preparada para facturacion electronica SUNAT.

## Stack

- **API:** PHP 8.2+, Laravel 12, Sanctum y REST versionada (`/api/v1`).
- **Web:** Next.js 16, React, TypeScript y Tailwind CSS.
- **Datos:** PostgreSQL con aislamiento multi-tenant mediante `inquilino_id` y RLS.

## Estructura

```text
back-softflyer/  API Laravel
front-next/      Aplicacion Next.js
docs-tecnicos/   Fuente de verdad funcional y tecnica
specs/           Specs de cada avance: contrato (backend) y experiencia (frontend)
```

## Arranque local

Requisitos: PHP 8.2+ con `pdo_pgsql` activo, Composer, Node 20+ y PostgreSQL 17.

Base de datos, una sola vez como `postgres`, desde `back-softflyer`. Crea los roles `softflyer_owner` (migraciones) y `softflyer_app` (API, sin permiso para saltarse RLS):

```powershell
psql -h 127.0.0.1 -U postgres -v owner_pw="..." -v app_pw="..." -f database/setup/crear_bd_local.sql
```

Luego copia esas contrasenas en `.env` (`DB_PASSWORD` y `DB_OWNER_PASSWORD`) y migra con el rol dueno:

```powershell
php artisan migrate --database=pgsql_owner --seed
```

API, desde `back-softflyer`:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Tiempo real (WebSockets), desde `back-softflyer`, en otra terminal. La configuración completa, la verificación y la puesta en producción están en [`back-softflyer/README.md`](back-softflyer/README.md#tiempo-real-websockets-con-reverb):

```powershell
php artisan reverb:start
```

Web, desde `front-next` (copia `.env.example` a `.env.local`; `NEXT_PUBLIC_REVERB_KEY` = `REVERB_APP_KEY` del backend):

```powershell
npm run dev
```

Cada empresa entra por su subdominio:

| URL | Que es |
|---|---|
| `http://localhost:3000` | Portal: probar la demo o ir a tu empresa |
| `http://demo.localhost:3000/login` | Cuenta demo (boton "Entrar a la demo sin contrasena") |
| `http://donjose.localhost:3000/login` | Cuenta de pago de ejemplo: `admin@donjose.pe` / `donjose-2026` |
| `http://localhost:3000/registro` | Prueba gratis de 7 dias con verificacion de correo |
| `http://admin.localhost:3000` | Backoffice de la plataforma (local: `admin@softflyer.pe` / `admin-softflyer-2026`) |

Administradores reales del backoffice: `php artisan softflyer:admin tu@correo.com`.

Pruebas: `php artisan test` usa la base `factura_softfly_test` con RLS real.

## Deploy a producción (checklist)

**PHP.** Usar 8.3.36 o superior de la rama 8.3 (el 21-oct-2026 salió el parche de seguridad CVE-2026-109618/109619, ejecución remota sin autenticación). No usar 8.2 (fin de soporte 31-dic-2026) ni 8.6 (aún RC). Tras actualizar, reiniciar PHP-FPM/Octane/Reverb. Extensiones: `soap` (Greenter), `zip`, `openssl`, `pdo_pgsql`, `mbstring`, `gd`, `bcmath`, `intl`, `curl`, `xml`.

**Base de datos.** Dos roles: `softflyer_owner` (solo migraciones) y `softflyer_app` (la app, sujeta a RLS). Migrar con `php artisan migrate --force --database=pgsql_owner`. Nunca `migrate:fresh`.

**`.env`.** `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` generada y respaldada (cifra certificados y clave SOL: perderla las vuelve irrecuperables), `APP_URL`, `SOFTFLYER_DOMINIO_CENTRAL`, `SOFTFLYER_FRONTEND_URL`, `DB_*` y `DB_OWNER_*`, `QUEUE_CONNECTION=database`, correo (`MAIL_*`) y `REVERB_*` con claves propias.

**Procesos.**
- Cron cada minuto: `* * * * * php /ruta/artisan schedule:run` (reintentos de envío a SUNAT, consulta de CDR, limpieza).
- Worker supervisado (Supervisor/systemd) con reinicio automático: `php artisan queue:work --tries=3`; reiniciarlo en cada deploy con `php artisan queue:restart`.
- Reverb supervisado si se usa tiempo real.

**Optimización.** `composer install --no-dev --optimize-autoloader`, luego `php artisan config:cache route:cache event:cache`.

**Frontend.** `npm ci && npm run build`; servir con el wildcard de subdominios (`*.dominio` y `admin.dominio`) y TLS.

**Primer arranque.** Crear el administrador del backoffice (`php artisan softflyer:admin correo`), y por cada cliente cargar en el backoffice certificado digital, usuario/clave SOL y tasa de IGV; entorno BETA hasta homologar, luego PRODUCCION. Verificar los puntos de la sección de specs "Pendiente de verificar solo en SUNAT producción".

## Principio rector

El Core conoce las reglas comunes; los modulos dependen del Core, nunca al reves. La seguridad entre empresas no depende de recordar un `WHERE`: PostgreSQL tambien protege cada fila.

Las decisiones completas viven en [`docs-tecnicos/`](docs-tecnicos/).
