# 009 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Errores con el formato del Doc. 07 §3.3. Todo se valida por **rol + sucursal** (Doc. 06 §6).

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/sesiones-caja/actual` | `caja.abrir` | 200 el turno abierto del usuario, o `data: null` |
| POST | `/sesiones-caja` | `caja.abrir` | 201 abre turno `{ "monto_apertura": "100.00", "sucursal_id"?, "caja_id"? }` |
| GET | `/sesiones-caja/{id}/resumen` | `caja.ver_movimientos` | 200 turno + `resumen` (ventas, por método, ingresos, egresos, `efectivo_esperado`) + `movimientos` |
| POST | `/sesiones-caja/{id}/movimientos` | `caja.registrar_movimiento_manual` | 201 `{ "tipo": "EGRESO", "monto": "20.00", "concepto": "Compra de gas" }` |
| POST | `/sesiones-caja/{id}/cierre` | `caja.cerrar` | 200 `{ "monto_cierre_declarado": "480.00" }` → turno cerrado con `monto_cierre_calculado` y `diferencia` |
| GET | `/pedidos/por-cobrar` | `ventas.crear` | 200 pedidos en `POR_COBRAR` de sus sucursales, el más antiguo primero |
| GET | `/pedidos/{id}` | `ventas.crear` (se suma a los existentes) | 200 pedido con `pendiente` y `cobrado` por plato |
| POST | `/pedidos/{id}/cobro` | `ventas.crear` + `Idempotency-Key` | 201 venta y pagos; cierra el pedido si queda cubierto |
| GET | `/metodos-pago` | `ventas.crear` | 200 catálogo `{ id, codigo, nombre, es_efectivo }` |

Sin `caja_id`, el turno se abre en la primera caja activa de la sucursal; si no hay, se crea "Caja principal". Administrar varias cajas queda para más adelante.

### Cobro

```json
{
  "detalle_ids": [11, 12],
  "version": 7,
  "pagos": [
    { "metodo_pago_id": 1, "monto": "30.00", "monto_recibido": "50.00" },
    { "metodo_pago_id": 3, "monto": "15.50", "referencia": "OP-84211" }
  ]
}
```

- `version` (opcional): si no coincide con la del pedido → 409 `CONFLICTO_VERSION`.
- `detalle_ids` omitido = toda la cuenta pendiente. Con una lista = cuenta dividida: esos platos se cobran en esta venta.
- La suma de `pagos[].monto` debe igualar el total de la venta; `monto_recibido` solo aplica a efectivo y genera `vuelto`.
- Respuesta: `{ "data": { "venta": { "id", "total", "estado" }, "pagos": [...], "vuelto": "20.00", "pedido": { "id", "estado", "version", "pendiente": "0.00" } } }`.
- El pedido pasa a `CERRADO` y la mesa a `LIBRE` cuando no queda ningún plato sin cobrar.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 409 | `CAJA_YA_ABIERTA` | El usuario ya tiene un turno abierto, o la caja la tiene otra persona |
| 409 | `SIN_TURNO_ABIERTO` | Cobrar o registrar movimientos sin turno abierto del usuario |
| 409 | `PEDIDO_NO_COBRABLE` | El pedido no está en `POR_COBRAR` |
| 409 | `DETALLE_YA_COBRADO` | Algún plato ya pertenece a otra venta |
| 422 | `PAGO_NO_CUBRE_TOTAL` | La suma de pagos no iguala el total (`detalles`: `total`, `pagado`, `falta`) |
| 422 | `VALIDACION` | Efectivo recibido menor al monto, método inactivo, platos ajenos al pedido |
| 409 | `CONFLICTO_VERSION` | El pedido cambió mientras se cobraba (Doc. 09 §3.6) |
| 409 | `SESION_CERRADA` | Movimiento o cobro en un turno ya cerrado |

### Tiempo real

| Evento | Canal | Cuerpo |
|---|---|---|
| `PedidoActualizado` (existente) | `sucursal.{id}.salon` | Al pasar a `POR_COBRAR` y al cerrarse; la pantalla Caja lo escucha |
| `CajaActualizada` | `sucursal.{id}.caja` | `{ "sesion_id": 3, "usuario_id": 2 }` tras abrir, cobrar, mover o cerrar |

Canal `sucursal.{id}.caja`: requiere `caja.abrir` o `caja.ver_movimientos` en esa sucursal.

## Decisiones

- **Un pedido, varias ventas** (Doc. 05 §2): `ventas` + `detalle_ventas` + `venta_detalle_pedido` (Doc. 08 §9); no hay `ventas.pedido_id` en el Core (Doc. 08 §13).
- **Precios con IGV incluido:** `total` es lo que suma la carta; `op_gravada = total / 1.18` y `igv` el resto, redondeados para cumplir `CHECK (total = …)`. Todo gravado hasta que haya afectación por producto.
- **Arqueo calculado, no copiado:** los cobros no se duplican en `movimientos_caja` (Doc. 08 §10). `monto_cierre_calculado` se guarda al cerrar como foto de auditoría.
- **El turno es del usuario:** `sesiones_caja.abierta_por`; un cajero cobra solo dentro de su turno y solo en su sucursal.
- **Sin clientes todavía:** `clientes` y `ventas.cliente_id` llegan con la facturación (H3), cuando haya boleta con DNI.
- **Un turno por persona y por caja:** índices únicos parciales; solo quien lo abrió cobra, mueve y cierra (ni siquiera el administrador).
- **Vuelto:** `pagos.monto` ya es lo aplicado a la venta, así que el efectivo esperado suma `monto` sin restar vueltos (equivale a la fórmula del Doc. 08 §10).
- **Inventario:** el descuento de stock (H4a) se engancha después al evento de venta; esta spec no lo toca.
- **Diferencia de cierre:** queda guardada en el turno (`declarado` y `calculado`); la bitácora de auditoría del inquilino aún no existe y se enganchará cuando se cree.

## Tareas

- [x] Migraciones: `cajas`, `sesiones_caja` (índice único parcial por caja abierta), `movimientos_caja`, `ventas`, `detalle_ventas`, `venta_detalle_pedido`, `pagos`, `metodos_pago` y sus políticas RLS
- [x] Permisos `caja.*` y `ventas.crear` en los roles Cajero y Administrador (seeders)
- [x] Casos de uso en `Core/Cash` y `Core/Sales`; cobro del pedido en `Modules/Restaurant`
- [x] Endpoints, canal y evento `CajaActualizada`
- [x] Idempotencia en `POST /pedidos/{id}/cobro`
- [x] Pruebas (`ChargeTest`, 9 casos): apertura única, cobro mixto con vuelto, dividido, reintento idempotente, sin turno, mozo sin permiso, otra sucursal, arqueo con diferencia, canal de caja
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-12)

- Código: `Core/Cash` (turnos, movimientos, `CashUpdated`), `Core/Sales` (`RegisterSale`, ventas, pagos, `/metodos-pago`), `Modules/Restaurant` (`ChargeOrder`, `ChargeController`, `venta_detalle_pedido`), `Shared/Domain/Money`.
- Migraciones: `2026_10_12_000100/200/300`.
- Suite: 114 en verde; los 8 que fallan son de RLS y ya fallaban antes (`DB_USERNAME=postgres` en `.env`).
