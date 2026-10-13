# 021 — Backend

## Contrato

**Sin cambios.** El contrato de la spec 006 ya manda `notas` por ítem y reparte comandas por estación; esta spec solo corrige el carrito del cliente y la visibilidad de la nota.

| Fuente | Uso |
|---|---|
| `POST /pedidos/{id}/comandas` (006) | Recibe `items[].notas` (≤ 200) y crea una comanda por estación con `estacion_efectiva_id` |
| `GET /pedidos/{id}` (006) | Devuelve `notas` por detalle; el pedido las muestra en «Enviados» |

## Decisiones

- Dos líneas con el mismo plato y notas distintas se mantienen separadas: son preparaciones distintas y cocina lo necesita así.
- Nada de backend nuevo: el envío ya viajaba bien; el problema estaba en el carrito local.

## Tareas

- [x] Confirmar que `notas` y el reparto por estaciones ya cubren la regla (probado en el E2E: dos comandas, `Bar` y `Cocina`, con la nota en el detalle)
