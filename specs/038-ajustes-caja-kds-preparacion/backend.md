# 038 — Backend

Extiende las specs 006, 007, 009 y 031. Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`.

## 1. Para llevar con mesa y boleta conjunta

### Esquema

Nueva columna `pedidos.mesa_referencia_id` (FK → `mesas`, nullable) con
`CHECK (mesa_referencia_id IS NULL OR tipo = 'PARA_LLEVAR')`. No se toca
`pedidos_mesa_check` ni `pedido_mesa`: el para llevar **no ocupa la mesa**.

### Contrato

| Método | Ruta | Cambio |
|---|---|---|
| POST | `/pedidos` | Acepta `mesa_referencia_id` (solo `tipo=PARA_LLEVAR`; exigido que la mesa esté activa). La sucursal se deriva del salón de esa mesa. |
| GET | `/pedidos/{pedido}` | `data.mesa_referencia` y, si es `SALON`, `data.acompanantes[]` con los para llevar activos de la misma mesa (`id, numero, estado, version, total, pendiente, detalles[]`). |
| GET | `/pedidos/por-cobrar` | Excluye los `PARA_LLEVAR` con `mesa_referencia_id`: se cobran con su mesa. |
| POST | `/pedidos/{pedido}/cobro` | Acepta `pedidos_adicionales: [id…]` (máx. 10). Cobra los platos pendientes de todos esos pedidos en **una sola venta y un solo comprobante**. Responde además `data.pedidos[]` con `{id, estado, version, pendiente}` por cada pedido afectado. |

```json
{
  "detalle_ids": [101, 102, 205],
  "pedidos_adicionales": [14],
  "version": 3,
  "pagos": [{ "metodo_pago_id": 1, "monto": "16.00" }]
}
```

### Reglas

- El pedido principal debe estar `POR_COBRAR`; los adicionales, `ABIERTO` o `POR_COBRAR`.
- Cada adicional debe ser `PARA_LLEVAR`, de la misma sucursal y con
  `mesa_referencia_id` igual a la mesa del principal; si no, `422 COBRO_GRUPO_INVALIDO`.
- Un pedido se cierra solo cuando ya no le quedan platos sin cobrar; si le quedan, sube `version`.
- La `Idempotency-Key` sigue funcionando igual: un reintento devuelve la primera respuesta.
- `resumen.ordenes` agrupa **por venta**: una fila con `mesa` y `mesa_referencia`.

## 2. Demora del KDS

Sin cambios de contrato. El frontend pasa a rojo desde `waiting >= 15` sobre `comandas.enviada_en`.

## 3. Gastos digitales

Nueva columna `movimientos_caja.metodo_pago_id` (FK → `metodos_pago`, nullable; nulo = efectivo).

```json
{
  "tipo": "EGRESO",
  "monto": "20.00",
  "concepto": "Pago por Yape al proveedor",
  "categoria": "INSUMOS",
  "metodo_pago_id": 4
}
```

`resumen` suma `egresos_efectivo` y `egresos_digital`; cada movimiento de `data.movimientos`
incluye `metodo_pago_id`, `metodo` y `es_efectivo`. `efectivo_esperado` solo resta egresos
cuyo método sea efectivo (o nulo). Un método digital en `INGRESO`/`RETIRO` responde 422.

## 4. Unidades de preparación

`ingredientes_preparacion.unidad` VARCHAR(8) nullable. Catálogo cerrado:
`ONZ`, `ML`, `GR`, `KG`. El contrato de preparaciones agrega `unidad` por ingrediente:

```json
"ingredientes": [{ "nombre": "Lomo", "cantidad": "8", "unidad": "ONZ" }]
```

Una unidad fuera del catálogo responde `422 VALIDACION` en `ingredientes.N.unidad`.
`cantidad` sigue siendo texto libre para no romper fichas antiguas.

## Tareas

- [x] Migraciones: mesa de referencia, método de pago del movimiento y unidad del ingrediente.
- [x] Caso de uso de cobro multi-pedido y validación de pertenencia.
- [x] Presentadores (acompañantes, mesa de referencia, resumen por venta).
- [x] Arqueo con separación efectivo/digital.
- [x] Pruebas: cobro conjunto, pedido de otra mesa, para llevar con mesa, unidades y gastos digitales.
