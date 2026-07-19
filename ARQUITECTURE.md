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

El detalle y las excepciones estan definidos en [`docs-tecnicos/`](docs-tecnicos/).
