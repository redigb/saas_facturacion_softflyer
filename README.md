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

## Principio rector

El Core conoce las reglas comunes; los modulos dependen del Core, nunca al reves. La seguridad entre empresas no depende de recordar un `WHERE`: PostgreSQL tambien protege cada fila.

Las decisiones completas viven en [`docs-tecnicos/`](docs-tecnicos/).
