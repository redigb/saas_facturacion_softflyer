# 006 — Backend

## Modelo (lote 6 del Doc. 08 §13, sin `clientes`)

Tablas del Doc. 08 §8 en `Modules/Restaurant`: `pedidos`, `pedido_mesa`, `comandas`, `detalle_pedidos`, `detalle_pedido_modificador`, todas con RLS.

Ajustes respecto al Doc. 08:
- `pedidos.cliente_id` se agrega con el cobro (H2), junto con la tabla `clientes`.
- `comandas.estacion_preparacion_id` es **nullable**: un plato sin estación (restaurante sin estaciones configuradas) va a una comanda "general" que verá cualquier KDS.
- `detalle_pedidos.precio_unitario` copia el precio del producto; `detalle_pedido_modificador.precio_adicional` copia el del modificador. Cambiar la carta no altera pedidos ya tomados.

## Contrato

Base `/api/v1`, subdominio, `Authorization: Bearer`, middleware `inquilino`, `auth:sanctum`, `cuenta.vigente`. Errores Doc. 07 §3.3; pedido de otro inquilino → 404.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/pedidos?sucursal_id=&estado=ABIERTO,POR_COBRAR` | `restaurante.pedidos.crear` o `panel.ver` | 200 pedidos activos (resumen) |
| POST | `/pedidos` | `restaurante.pedidos.crear` + `Idempotency-Key` | 201 pedido |
| GET | `/pedidos/{id}` | `restaurante.pedidos.crear` o `panel.ver` | 200 pedido completo |
| POST | `/pedidos/{id}/comandas` | `restaurante.pedidos.crear` + `Idempotency-Key` | 201 pedido completo |
| POST | `/pedidos/{id}/detalles/{detalle}/anular` | `restaurante.pedidos.anular_item` | 200 pedido completo |
| POST | `/pedidos/{id}/cuenta` | `restaurante.pedidos.crear` | 200 pedido (→ `POR_COBRAR`) |
| POST | `/pedidos/{id}/reabrir` | `restaurante.pedidos.crear` | 200 pedido (→ `ABIERTO`) |
| POST | `/pedidos/{id}/anular` | `restaurante.pedidos.crear` | 200 pedido (→ `ANULADO`, mesa libre) |

### Abrir pedido

```json
{ "tipo": "SALON", "mesa_id": 4, "numero_comensales": 3 }
```
- `tipo`: `SALON` (exige `mesa_id`) o `PARA_LLEVAR` (sin mesa; exige `sucursal_id` si el usuario trabaja en varias).
- La mesa debe estar activa y `LIBRE` → si no, **409 `MESA_OCUPADA`** con `detalles.pedido_id` del pedido que la tiene (el mozo entra a ese).
- `numero`: correlativo diario por sucursal (`fecha_operacion` en hora de Lima).

### Pedido completo

```json
{
  "data": {
    "id": 31, "numero": 42, "tipo": "SALON", "estado": "ABIERTO", "version": 3,
    "sucursal_id": 1, "mesa": { "id": 4, "codigo": "M4", "salon_id": 1 },
    "mozo": { "id": 7, "nombre": "Rosa Quispe" },
    "numero_comensales": 3, "abierto_en": "2026-10-08T17:02:11Z",
    "total": "93.00",
    "detalles": [
      { "id": 88, "producto_id": 15, "nombre": "Lomo saltado", "cantidad": "1.000",
        "precio_unitario": "42.00", "notas": "sin cebolla", "estado_cocina": "PENDIENTE",
        "comanda": { "id": 12, "numero": 1, "estacion_preparacion_id": 1, "enviada_en": "2026-10-08T17:03:40Z" },
        "modificadores": [ { "id": 5, "nombre": "Jugoso", "precio_adicional": "0.00" } ],
        "subtotal": "42.00",
        "anulado": null }
    ]
  }
}
```
- `anulado`: `null` o `{ "en": "...", "por": "Ana", "motivo": "cliente cambió de idea" }`.
- `total` = suma de `subtotal` de los detalles no anulados; `subtotal` = cantidad × (precio + modificadores).

### Enviar a cocina (`POST /pedidos/{id}/comandas`)

```json
{ "items": [ { "producto_id": 15, "cantidad": 1, "notas": "sin cebolla", "modificador_ids": [5] } ] }
```
- Crea los detalles y **una comanda por estación** (la del producto o, si no, la de su categoría; sin estación → comanda general). `numero` de comanda: 1, 2, 3… por pedido y estación.
- Idempotente: un reintento con la misma `Idempotency-Key` devuelve la misma respuesta sin crear nada.
- Reglas: pedido `ABIERTO`; producto activo y vendible; `cantidad` 0.001–999 (3 decimales, para porciones); modificadores activos, de grupos asignados al producto y que respeten mínimo/máximo de cada grupo; hasta 100 ítems por envío.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 409 | `MESA_OCUPADA` | La mesa ya tiene un pedido activo (`detalles.pedido_id`) |
| 409 | `PEDIDO_NO_ABIERTO` | Enviar o pedir cuenta sobre un pedido que no está `ABIERTO` (o reabrir uno que no está `POR_COBRAR`) |
| 409 | `PEDIDO_CON_ENVIOS` | Anular un pedido que ya tiene platos enviados sin anular |
| 409 | `DETALLE_YA_ANULADO` | Anular dos veces el mismo plato |
| 422 | `VALIDACION` | Producto inactivo, modificadores que no cumplen el grupo, motivo vacío… |

> **Actualización (spec 025):** enviar a cocina, pedir cuenta, reabrir y anular exigen ser el mozo dueño del pedido o jefatura (`panel.ver` / `restaurante.mesas.gestionar`); si no, **403 `PEDIDO_AJENO`** con `detalles.mozo`.

### Eventos en tiempo real (spec 005)

| Evento | Canal | Cuerpo |
|---|---|---|
| `PedidoActualizado` | `sucursal.{id}.salon` | `{ "pedido_id", "mesa_ids", "estado", "version", "usuario_id" }` |
| `ComandaEnviada` | `sucursal.{id}.estacion.{id}` (o `sucursal.{id}.estacion.general`) | `{ "comanda_id", "pedido_id", "usuario_id" }` |
| `PlatoAnulado` | canal de la estación de su comanda | `{ "detalle_id", "comanda_id", "pedido_id", "usuario_id" }` |

## Decisiones

- **Carrito local + envío atómico**: el mozo arma la tanda en su dispositivo sin latencia y la manda en una petición. No hay ítems "guardados sin enviar" en el servidor en esta spec (`comanda_id` siempre se llena al crear).
- **Sin bloqueo optimista para agregar**: agregar platos es conmutativo; dos mozos sumando a la misma mesa no deben recibir 409. La fila del pedido se bloquea (`FOR UPDATE`) para numerar comandas; `version` sube en cada cambio para que las pantallas detecten novedades.
- **La unicidad de la mesa la garantiza la base** (`UNIQUE (mesa_id) WHERE liberada_en IS NULL` en `pedido_mesa`), además de la validación.
- Canal `estacion.general` para comandas sin estación (se agrega a `channels.php`).

## Tareas

- [x] Migración del lote 6 (sin `clientes`) con RLS, CHECKs y el índice único parcial de `pedido_mesa`
- [x] Modelos y relaciones
- [x] Abrir pedido (mesa o para llevar, correlativo diario por sucursal, mesa → OCUPADA)
- [x] Enviar a cocina: validación de productos y modificadores, comandas por estación, precios congelados, idempotencia
- [x] Anular plato enviado (permiso + motivo), pedir cuenta, reabrir, anular pedido
- [x] Listado de pedidos activos y pedido completo
- [x] Eventos `PedidoActualizado`, `ComandaEnviada`, `PlatoAnulado`; canal `estacion.general`
- [x] Pruebas: abrir, mesa ocupada (incluido el índice único), para llevar, enviar con comandas por estación, modificadores fuera de regla, idempotencia del envío, anular plato con y sin permiso, cuenta/reabrir/anular, permisos (cocinero no toma pedidos), 404 entre inquilinos, eventos
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: migración `2026_10_08_000200_create_pedidos_comandas`, modelos `Order`, `OrderItem`, `KitchenTicket`, `Application/ManageOrders`, `Presentation/{OrderPresenter, Controllers/OrderController}`, eventos `OrderUpdated`, `TicketSent`, `ItemVoided` y `StationChannel`.
- `permiso:a|b` en `RequirePermission`: basta con uno de los permisos (lectura de pedidos para mozo o administrador).
- Pruebas: `tests/Feature/Restaurant/OrderTest.php` (10 casos). Suite: 102 en verde como `softflyer_app`.
