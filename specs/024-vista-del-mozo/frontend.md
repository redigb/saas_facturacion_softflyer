# 024 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, `tabular-nums`).

## Flujo

1. **Entrar (mozo):** el panel lo lleva directo a **Pedidos** (su salón). El menú le muestra solo lo suyo: Pedidos, Mis órdenes y Carta.
2. **Mis órdenes:** lista de sus pedidos activos (mesa o para llevar) con número, estado (abierta / por cobrar), tiempo, platos y total. Tocar uno entra al pedido. Se actualiza en vivo.
3. **Carta (lectura):** la misma pantalla del admin pero sin controles: sin «Agregar plato», sin «Nueva», sin switches, sin editar precios.
4. **Tablet y celular:** los layouts POS existentes (plano, mesa, carrito, cocina) ya se adaptan; nada nuevo que construir.

## Experiencia

| Tema | Decisión |
|---|---|
| Menú por rol | `navigation.ts`: «Mis órdenes» nueva (icono `lista`) y «Carta» visible también para quien toma pedidos |
| Mis órdenes | Reusa `useActiveOrders` (misma caché y tiempo real: `PedidoActualizado` la mantiene al día); filtro `mozo.id === yo` |
| Tarjetas | Mesa/«Para llevar» + `#número`, chip de estado (Abierta azul / Por cobrar ámbar), N min · N platos, total en `tabular-nums` |
| Estados | Esqueleto al cargar, vacío con guía («abre una mesa o un para llevar…»), error con «Reintentar» |
| Carta lectura | Sin cambios de código: los permisos ya apagan botones y switches; solo se agrega la entrada al menú |
| Responsive | Celular: una columna con las barras existentes (captura a 375 px); tablet/PC: plano y carrito lado a lado (specs 018/022) |

## Tareas

- [x] Menú: «Mis órdenes» (nueva) y «Carta» visible con `restaurante.pedidos.crear`
- [x] Página `/panel/mis-pedidos` con su vista de tarjetas, estados y enlace al pedido
- [x] Verificación visual como mozo (celular 375 px y PC) y como admin (sin regresiones)
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
