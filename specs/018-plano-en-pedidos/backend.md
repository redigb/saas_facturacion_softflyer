# 018 — Backend

## Contrato

**Sin cambios.** Esta spec no agrega ni modifica endpoints: la vista reutiliza los contratos ya cerrados.

| Fuente | Uso en la vista Plano |
|---|---|
| `GET /salones` (spec 003) | Pestañas de salón y su orden |
| `GET /salones/{id}/plano` (spec 003) | Mesas con forma, tamaño, rotación, capacidad y estado; elementos dibujados (barra, puertas, caja…) |
| `GET /pedidos?estado=ABIERTO,POR_COBRAR` (spec 006) | Pedido activo por mesa: número, estado y total |
| `POST /pedidos`, `GET /pedidos/{id}` (spec 006) | Abrir el pedido de una mesa libre / entrar al de una ocupada |
| Eventos `PedidoActualizado` y `PlanoActualizado` (spec 005) | Colores e info en vivo; geometría al día |

`mesas.estado` del plano es de solo lectura (spec 003). La vista recalcula "ocupada" y "por cobrar" con los pedidos activos (spec 006) para que el color siga al pedido y no al plano; `mesas.estado` solo aporta `BLOQUEADA`.

## Decisiones

- El estado operativo lo manda el pedido activo, no la columna `mesas.estado`: el plano puede estar desactualizado y el pedido no.
- No se agrega nada al backend a propósito: si algún día los asientos de barra se operan como mesas, será otra spec.

## Tareas

- [x] Confirmar que los contratos 003 y 006 cubren todo lo que la vista necesita
- [x] Pruebas del backend en verde sin cambios (`php artisan test` — 135 en verde, 2026-10-13)
