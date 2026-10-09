# Softflyer API

API REST (Laravel 12) de **Softflyer**: un ERP SaaS multi-tenant para que los restaurantes peruanos tomen pedidos en tiempo real, cobren, controlen su stock y emitan boletas y facturas electrónicas SUNAT sin detener la venta.

## Propósito

El primer cliente piloto pidió tres cosas, y todo el trabajo se prioriza por ellas (Doc. 09 §1):

1. **Pedidos en tiempo real:** órdenes rápidas, sin latencia, con la cocina enterándose al instante.
2. **No facturar a mano:** al cobrar, el comprobante sale solo y SUNAT se resuelve en segundo plano.
3. **Control de stock:** saber cuánto queda y que se descuente al vender.

## Cómo trabajamos: por specs

Cada avance nace como una **spec** en [`../specs/`](../specs/) antes de escribir código. Una spec cubre backend y frontend: en `backend.md` el **contrato de la API** es lo que manda, y el frontend lo consume tal cual. Solo hay **una spec abierta a la vez**. Las reglas están en [`../specs/README.md`](../specs/README.md).

Las specs no reemplazan a los documentos técnicos: los aplican. La fuente de verdad sigue en [`../docs-tecnicos/`](../docs-tecnicos/).

## Arquitectura en una línea

```text
Next.js -> /api/v1 (Laravel) -> Core + Modules -> PostgreSQL con RLS
```

```text
app/
├── Core/        Tenancy, Iam, Sales, Billing, Inventory, Cash
├── Modules/     Restaurant (salón, mesas, pedidos, comandas)
├── Platform/    backoffice de la plataforma (admin.{dominio})
└── Shared/      utilidades sin lógica de negocio
```

Cada contexto usa las capas `Domain`, `Application`, `Infrastructure` y `Presentation`. Los módulos dependen del Core, nunca al revés (`tests/Unit/ArchitectureTest.php`). Detalle en [`../ARQUITECTURE.md`](../ARQUITECTURE.md).

## Arranque local

Requisitos: PHP 8.2+ con `pdo_pgsql`, Composer y PostgreSQL 17.

```powershell
# Una sola vez, como postgres: crea los roles softflyer_owner y softflyer_app
psql -h 127.0.0.1 -U postgres -v owner_pw="..." -v app_pw="..." -f database/setup/crear_bd_local.sql

copy .env.example .env   # completar DB_PASSWORD y DB_OWNER_PASSWORD
composer install
php artisan key:generate
php artisan migrate --database=pgsql_owner --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## Pruebas

```powershell
php artisan test
```

Usa la base `factura_softfly_test` con RLS real. Una spec no se cierra con pruebas en rojo.
