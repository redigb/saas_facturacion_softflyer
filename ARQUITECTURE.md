# Arquitectura

Softflyer separa presentacion, negocio y datos: Next.js consume una API REST Laravel; Laravel concentra el dominio; PostgreSQL garantiza persistencia y aislamiento multi-tenant.

```text
Next.js -> Laravel API /api/v1 -> Core + Modulos -> PostgreSQL + RLS
```

## Reglas esenciales

- Un solo esquema compartido, con `tenant_id` y RLS en tablas multi-tenant.
- Capas por modulo: `Domain`, `Application`, `Infrastructure`, `Presentation`.
- Los modulos pueden depender del Core; el Core nunca depende de un modulo.
- Sanctum para clientes propios; operaciones criticas con idempotencia.
- Facturacion SUNAT asincrona mediante colas para no detener la venta.
- Contratos JSON estables, versionados y documentados con OpenAPI.

## Estructura del backend

```text
back-softflyer/app/
├── Core/                  Reglas comunes a todo vertical (Fase 1)
│   ├── Tenancy/           inquilinos, planes, suscripciones, empresas, sucursales
│   ├── Iam/               usuarios, roles, permisos
│   ├── Sales/             ventas, clientes
│   ├── Billing/           comprobantes, series, envio SUNAT (Greenter)
│   ├── Inventory/         productos, almacenes, stock, kardex
│   └── Cash/              cajas, sesiones y movimientos de caja
├── Modules/
│   └── Restaurant/        salones, mesas, pedidos, comandas
├── Platform/              backoffice del dueno: clientes, planes, pruebas (admin.{dominio})
└── Shared/                utilidades sin logica de negocio
```

Cada contexto repite las mismas cuatro capas:

| Capa | Contiene | Puede usar |
|---|---|---|
| `Domain` | Entidades, value objects, enums y reglas puras | Solo PHP y otros `Domain` del Core |
| `Application` | Casos de uso que orquestan una operacion | `Domain` e interfaces de repositorio |
| `Infrastructure` | Modelos Eloquent, repositorios, jobs, Greenter | `Domain` y `Application` |
| `Presentation` | Controllers, Form Requests, Resources, middleware, `routes.php` | `Application` e `Infrastructure` |

- Las rutas de `Presentation/routes.php` se cargan solas bajo `/api/v1`.
- `tests/Unit/ArchitectureTest.php` falla si el Core usa `App\Modules` o si un `Domain` depende de Laravel o de otra capa.
- El codigo va en ingles y las tablas y recursos de la API en espanol (Doc. 02 §14, Doc. 07 §2.1).
- Un vertical nuevo es una carpeta mas en `Modules/`: no se toca el Core.
- `Platform` depende del Core, nunca al reves. Tiene su propio guard (`auth:plataforma`) y solo responde en `admin.{dominio}`: un token de restaurante no sirve en el backoffice ni al reves.
- El backoffice no se salta RLS: lee y escribe cada cliente dentro de su contexto. El rol `BYPASSRLS` de solo lectura queda como opcion en `database/setup/rol_plataforma_opcional.sql`.

El detalle y las excepciones estan definidos en [`docs-tecnicos/`](docs-tecnicos/).
