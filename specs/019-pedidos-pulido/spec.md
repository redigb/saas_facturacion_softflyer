# 019 — Pulido de la operación de pedidos

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (ajustes pedidos por el negocio)
**Documentos:** specs 003, 006 y 018

## Qué y por qué

Tres ajustes que salieron de usar el sistema en vivo:

1. **Liberar una mesa sin salir del plano.** Anular un pedido abierto por error obligaba a entrar a la mesa. Con la vista Plano (spec 018) ahora se hace desde ahí: **mantener presionada** una mesa ocupada (o clic derecho en PC) abre la confirmación de anulación. Nunca libera en seco: siempre pasa por anular o por cobrar.
2. **"Para llevar" vacío.** Si se creaba un para llevar y se volvía sin cargar nada, quedaba un `0.00 #X` suelto en el panel. Ahora, al salir al salón sin platos, el pedido se descarta solo, y el panel nunca muestra para llevar sin platos.
3. **Menú al día.** Al agregar o cambiar platos/categorías, la pantalla de pedidos seguía mostrando la carta vieja (`["carta"]` con `staleTime: Infinity` y sin invalidación de los cambios propios) hasta recargar. Ahora cualquier cambio de carta refresca el menú al instante.

## Criterios de aceptación

- [x] Mantener presionada una mesa **con pedido** en la vista Plano (o clic derecho) abre la confirmación "¿Anular el pedido #N…?"; confirmar lo anula, la mesa queda libre y se muestra el aviso. Si el pedido tiene platos enviados, la API lo impide y se muestra su mensaje.
- [x] Mantener presionada una mesa libre no hace nada y no interfiere con el toque normal (un toque sigue abriendo el pedido).
- [x] El gesto no interfiere con el scroll táctil ni con la edición del plano (solo existe en la vista Pedidos).
- [x] Un "para llevar" sin platos no aparece en "Pedidos para llevar activos" (ni en su contador).
- [x] Al salir de un "para llevar" vacío con "Volver al salón", el pedido se anula solo: no deja rastro visible en el panel.
- [x] Un "para llevar" con platos se comporta como siempre.
- [x] Guardar/activar/desactivar/borrar platos y categorías (y grupos de modificadores y estaciones) refresca el menú de pedidos sin recargar la página.
- [x] La leyenda del plano anuncia el gesto: "Toca una mesa para abrir o ver su pedido · mantén presionada una ocupada para anular".

## Fuera de alcance

- Cobrar desde el plano: el cobro sigue viviendo en Caja.
- Gestionar la carta desde Pedidos (sigue siendo la pantalla Carta).
- Mesas (SALON) abiertas sin platos: siguen ocupadas hasta anular o cobrar.
- Avisos push.

## Cierre (2026-10-13)

- Código: `plano/floor-canvas.tsx` (pulsación larga de 550 ms con tolerancia de 10 px, clic derecho como alternativa, consumo del toque posterior al gesto), `pedidos/salon-floor.tsx` (traduce el gesto a la mesa del plano), `pedidos/salon-view.tsx` (ConfirmDialog de anulación desde el plano, leyenda con el gesto, filtro `platos > 0` para el panel de "para llevar"), `pedidos/order-view.tsx` (descarte del para llevar vacío al volver al salón) y `carta/queries.ts` (`refreshMenu`: toda mutación de carta invalida `["carta"]`).
- E2E con navegador real en la demo y en Don José: el gesto abre "¿Anular el pedido #1 de la mesa M1?" y "No" lo cierra sin tocar nada; el "para llevar" vacío se anula solo al volver al salón y no aparece en el panel (verificado además en PostgreSQL: queda `ANULADO`); desactivar "Amburguesas" en Carta y volver a Pedidos **sin recargar** la quita del menú al instante, y al reactivarla vuelve.
- `npx tsc --noEmit` y `npm run lint` sin errores; `check_ui.py` sin advertencias nuevas (las 93 existentes son previas del SVG y el editor). Backend sin cambios: su suite ya estaba en verde (135).
- Limpieza de datos de prueba (reportada): se anularon/borraron los cinco "para llevar" vacíos que habían quedado de pruebas previas del usuario (ids 5–9) y los pedidos de prueba propios (ids 10 y 11). Los pedidos 1, 2 y 4 no se tocaron; la hamburguesa "Amburguesas" quedó activa y visible en Don José.
