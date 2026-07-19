# Softflyer

> Un ERP SaaS multi-tenant para que los negocios peruanos vendan, controlen y facturen sin perder el ritmo de su operacion.

Softflyer nace como un nucleo empresarial reutilizable y crece mediante modulos verticales: restaurante, farmacia, hotel y otros. La primera meta es sencilla y exigente: una base clara, segura y preparada para facturacion electronica SUNAT.

## Stack

- **API:** PHP 8.3 local, Laravel 12 y REST versionada.
- **Web:** Next.js 16, React, TypeScript y Tailwind CSS.
- **Datos:** PostgreSQL con aislamiento multi-tenant mediante `tenant_id` y RLS.

## Estructura

```text
back-softflyer/  API Laravel
front-next/      Aplicacion Next.js
docs-tecnicos/   Fuente de verdad funcional y tecnica
```

## Arranque local

API, desde `back-softflyer`:

```powershell
& "C:\laragon\bin\php\php-8.3.21-Win32-vs16-x64\php.exe" artisan serve --host=127.0.0.1 --port=8000
```

Web, desde `front-next`:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abre `http://127.0.0.1:3000`. La primera integracion disponible es `GET http://127.0.0.1:8000/api/v1/hello`.

## Principio rector

El Core conoce las reglas comunes; los modulos dependen del Core, nunca al reves. La seguridad entre empresas no depende de recordar un `WHERE`: PostgreSQL tambien protege cada fila.

Las decisiones completas viven en [`docs-tecnicos/`](docs-tecnicos/).
