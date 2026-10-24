# 019 — Backend

## Contrato

**Sin cambios.** Los tres ajustes usan lo que ya existe:

| Fuente | Uso |
|---|---|
| `POST /pedidos/{id}/anular` (spec 006) | Anular desde el plano (pulsación larga) y descartar el "para llevar" vacío al salir. Sus reglas no cambian: pedido sin platos enviados; `409 PEDIDO_CON_ENVIOS` si los tiene |
| `GET /carta` (spec 002) | El menú de pedidos: el frontend lo invalida al cambiar la carta; la API ya lo arma correcto (verificado: la categoría y el plato creados en Don José aparecen en su `/carta`) |
| `GET /pedidos` (spec 006) | El resumen trae `platos`, que el panel usa para no mostrar para llevar vacíos |

## Decisiones

- El descarte del "para llevar" vacío es del cliente (al salir con "Volver al salón"): el servidor no adivina intenciones. La regla de oro se mantiene: nada se borra; el pedido queda `ANULADO`.
- No se agrega limpieza automática en el servidor para pedidos vacíos por si una integración futura (kiosko, pedidos por WhatsApp) los usa en dos pasos.

## Tareas

- [x] Confirmar que `POST /pedidos/{id}/anular` y `GET /carta` cubren los tres ajustes sin cambios (2026-10-13)
