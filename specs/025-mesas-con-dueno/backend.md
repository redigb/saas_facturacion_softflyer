# 025 — Backend

## Contrato

**Cambio de regla en el contrato de la spec 006** (anotado también en su documento): las operaciones de un pedido exigen ser **su mozo dueño o jefatura**.

| Operación | Regla nueva |
|---|---|
| `POST /pedidos/{id}/comandas` | Dueño del pedido, encargado o admin |
| `POST /pedidos/{id}/cuenta` | Dueño del pedido, encargado o admin |
| `POST /pedidos/{id}/reabrir` | Dueño del pedido, encargado o admin |
| `POST /pedidos/{id}/anular` | Dueño del pedido, encargado o admin |
| `POST /pedidos` / abrir mesa | Sin cambios: mesa ocupada → 409 `MESA_OCUPADA` (ya existía) |
| Cobro (`/cobro`) y cocina (estados, entregado) | Sin cambios: sus permisos mandan |

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 403 | `PEDIDO_AJENO` | Operar un pedido abierto por otra persona sin ser jefatura (`detalles.mozo` con el nombre) |

### Definición de jefatura

- `panel.ver` (Administrador) **o** `restaurante.mesas.gestionar` (Encargado de salón).
- Se evalúa con `User::hasPermission`, la misma fuente que el resto del sistema.

## Decisiones

- **Guard central** `ensureCanOperate()` en `ManageOrders`, aplicado a enviar, cuenta, reabrir y anular: una sola regla en un solo lugar.
- **Sin permiso nuevo**: se reutilizan permisos existentes para no re-sembrar roles de los restaurantes ya creados.
- El 409 `MESA_OCUPADA` sigue igual (la mesa nunca acepta doble cuenta); la novedad es *quién puede operar* la cuenta existente.

## Tareas

- [x] `ensureCanOperate`: dueño o jefatura; 403 `PEDIDO_AJENO` con `detalles.mozo`
- [x] Aplicarlo a `send`, `requestBill`, `reopen` y `cancel`
- [x] Pruebas: mozo dueño sí; mozo ajeno 403 en las cuatro; encargado sí; admin sí (`OrderAccessTest`)
- [x] Pruebas en verde (`php artisan test` — 143 en verde, 2026-10-13)
