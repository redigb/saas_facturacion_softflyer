# 019 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, `ConfirmDialog`, sin diálogos nativos).

## Para quién y dónde

**El mozo y el encargado**, en la tablet del salón o la PC del mostrador, en plena hora punta.

## Flujo

1. **Anular desde el plano:** en `/panel/pedidos` (vista Plano), mantener presionada una mesa con pedido (o clic derecho en PC) ~0.6 s → se abre **ConfirmDialog**: "¿Anular el pedido #N de la mesa M…?". Confirmar → el pedido se anula, la mesa vuelve a libre y se muestra el aviso. Un toque normal sigue abriendo la mesa.
2. **Para llevar vacío:** tocar "Para llevar" abre su folio como siempre; si se vuelve al salón sin agregar nada, el pedido se descarta solo (queda `ANULADO`, sin rastro en el panel). El panel no muestra para llevar sin platos.
3. **Menú al día:** al guardar/activar/desactivar/borrar platos, categorías, grupos o estaciones en Carta, el menú de pedidos se refresca al instante (sin recargar).

## Experiencia

| Tema | Decisión |
|---|---|
| Gesto | Pulsación larga (550 ms) con tolerancia de 10 px para no chocar con el scroll; clic derecho en PC como alternativa; se consume el toque para no abrir la mesa después del gesto |
| Solo con pedido | La confirmación solo aparece si la mesa tiene pedido; una mesa libre no reacciona al gesto |
| Anulación imposible | Si el pedido tiene platos enviados, se muestra el mensaje de la API (se cobra la cuenta o se anulan platos) |
| Descubribilidad | La leyenda del plano anuncia el gesto |
| Avisos | Toasts de siempre: éxito "Pedido #N anulado: la mesa quedó libre."; error con el mensaje de la API |
| Para llevar sin platos | No aparece en la sección ni en el contador; el descarte se dispara al pulsar "Volver al salón" (fire-and-forget; si falla, el filtro igual lo oculta) |
| Frescura del menú | Todas las mutaciones de carta invalidan `["carta"]` además de sus propias claves |
| Accesibilidad | El gesto es un atajo extra: la anulación sigue disponible con botones en la pantalla del pedido |

## Tareas

- [x] Pulsación larga (y clic derecho) en mesas con pedido en la vista Plano → ConfirmDialog → anular
- [x] Consumir el toque tras el gesto; sin efecto en mesas libres ni en el editor
- [x] Leyenda del plano anuncia el gesto
- [x] "Para llevar" vacío: descarte al salir y filtro en el panel
- [x] Invalidar `["carta"]` en todas las mutaciones de la carta
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
