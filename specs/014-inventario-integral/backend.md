# Backend — contrato

Todas las rutas usan `/api/v1`, autenticación, cuenta vigente y aislamiento por inquilino.

## Lectura

- `GET /inventario?sucursal_id=` — resumen, almacenes autorizados y existencias.
- `GET /inventario/catalogos?sucursal_id=` — unidades y estaciones disponibles para administración.
- `GET /inventario/kardex?almacen_id=&producto_id=&despues_de=` — historial por cursor.

## Administración

- `POST /inventario/articulos` — crea un artículo inventariable.
- `PATCH /inventario/articulos/{producto}` — edita sus datos de inventario.

Requieren `inventario.administrar`.

## Operación

- `POST /inventario/movimientos` — entrada, salida o merma.
- `POST /inventario/conteos` — conteo físico y ajuste compensatorio.

Requieren `inventario.ajustar`. Las lecturas requieren `inventario.ver`.

Errores de saldo insuficiente usan `STOCK_INSUFICIENTE` (422). Un almacén ajeno o no autorizado responde 403; un recurso de otro inquilino queda oculto por RLS/404.

## Tareas

- [x] Migración, constraints, índices y RLS.
- [x] Modelos y servicio transaccional con bloqueos.
- [x] Permisos por rol y alcance por estación KDS.
- [x] Controladores y rutas.
- [x] Pruebas de permisos, kardex, conteos, saldo y multi-tenant.
