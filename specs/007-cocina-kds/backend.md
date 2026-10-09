# 007 — Backend

## Contrato

Base `/api/v1`, subdominio, `Authorization: Bearer`, middleware `inquilino`, `auth:sanctum`, `cuenta.vigente`. Errores Doc. 07 §3.3; recurso de otro inquilino → 404.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/cocina/comandas?sucursal_id=&estacion_id=` | `restaurante.cocina.actualizar_estado` o `panel.ver` | 200 comandas activas de la estación |
| PATCH | `/cocina/detalles/{detalle}` | ver tabla de transiciones | 200 comanda actualizada |
| POST | `/cocina/comandas/{comanda}/listo` | `restaurante.cocina.actualizar_estado` | 200 comanda actualizada (todos sus platos vigentes → `LISTO`) |

`estacion_id`: id de la estación o `general` (comandas sin estación). Sin `sucursal_id`, la primera sucursal del usuario.

### Comanda (KDS)

```json
{
  "data": [
    {
      "id": 12, "numero": 1, "estacion_preparacion_id": 1, "enviada_en": "2026-10-08T17:03:40Z",
      "enviada_por": "Rosa Quispe",
      "completa": false,
      "pedido": { "id": 31, "numero": 42, "tipo": "SALON", "mesa": "M4", "estado": "ABIERTO" },
      "detalles": [
        { "id": 88, "nombre": "Lomo saltado", "cantidad": "2.000", "notas": "sin cebolla",
          "modificadores": ["Jugoso"], "estado_cocina": "EN_PREPARACION", "anulado": false }
      ]
    }
  ]
}
```

- **Activa** = tiene al menos un plato vigente (no anulado) en `PENDIENTE` o `EN_PREPARACION`, de un pedido `ABIERTO` o `POR_COBRAR`. Más las que quedaron listas en los últimos 10 minutos (para deshacer), marcadas por su estado.
- Sin precios ni datos de cliente: el cocinero no los necesita (Doc. 08 §4).
- `completa`: ningún plato vigente sigue en cola o preparación (la comanda va a la franja "Recién listos"). Una comanda con todo `ENTREGADO` sale del tablero.

### Transiciones (`PATCH /cocina/detalles/{detalle}` con `{ "estado_cocina": "LISTO" }`)

| De → a | Quién |
|---|---|
| `PENDIENTE` → `EN_PREPARACION` → `LISTO` (también saltando directo a `LISTO`) | `restaurante.cocina.actualizar_estado` |
| Un paso atrás (`LISTO` → `EN_PREPARACION` → `PENDIENTE`): deshacer | `restaurante.cocina.actualizar_estado` |
| `LISTO` → `ENTREGADO` | `restaurante.pedidos.crear` (el mozo) o `restaurante.cocina.actualizar_estado` |

Repetir el estado actual responde 200 sin cambios (idempotente por naturaleza).

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 409 | `DETALLE_ANULADO` | Cambiar el estado de un plato anulado |
| 409 | `TRANSICION_INVALIDA` | Saltos no permitidos (ej. `ENTREGADO` → `PENDIENTE`, `PENDIENTE` → `ENTREGADO`) |
| 409 | `PEDIDO_NO_ACTIVO` | El pedido está cerrado o anulado |

### Eventos en tiempo real

| Evento | Canal | Cuerpo |
|---|---|---|
| `EstadoCocinaActualizado` | `sucursal.{id}.estacion.{id\|general}` | `{ "comanda_id", "pedido_id", "usuario_id" }` (sincroniza otras pantallas de la estación) |
| `PlatoListo` | `sucursal.{id}.mozo.{mozo_id}` | `{ "pedido_id", "detalle_ids", "mesa": "M4", "platos": ["2× Lomo saltado"], "usuario_id" }` |
| `PedidoActualizado` | `sucursal.{id}.salon` | el de la spec 006 (el salón y el pedido del mozo se refrescan) |

Cada cambio sube `pedidos.version`.

## Decisiones

- El mozo destinatario de `PlatoListo` es el `mozo_id` del pedido.
- "Todo listo" de una comanda es una sola operación (un toque del cocinero, un evento por destinatario).
- `PlatoListo` lleva los nombres de los platos y la mesa para que el aviso se lea sin abrir nada; sigue siendo información que el mozo ya puede ver.

## Tareas

- [x] Caso de uso de cocina: listar comandas activas por estación, transiciones con permisos, "todo listo"
- [x] Eventos `EstadoCocinaActualizado` y `PlatoListo`; `PedidoActualizado` en cada cambio
- [x] Rutas y permisos (`permiso:a|b`)
- [x] Pruebas: lista por estación y general (sin precios), transiciones válidas e inválidas, deshacer, permisos (mozo solo entrega), plato anulado, todo listo, eventos al mozo correcto, 404 entre inquilinos
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: `Application/KitchenBoard`, `Presentation/Controllers/KitchenController`, eventos `KitchenStatusUpdated` y `DishReady`, relación `KitchenTicket::sender()`.
- Pruebas: `tests/Feature/Restaurant/KitchenTest.php` (7 casos). Los helpers de restaurante de prueba pasaron al trait `tests/Feature/Restaurant/Concerns/BuildsRestaurant.php`, compartido con `OrderTest`. Suite: 110 en verde como `softflyer_app`.
