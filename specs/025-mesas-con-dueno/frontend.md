# 025 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, sin diálogos nativos).

## Flujo

1. **Mesa ajena (mozo):** tocar una mesa ocupada por otro muestra el aviso *"La abrió José Ramírez. Solo esa persona, el encargado o el admin pueden atenderla."* y **no navega** (aplica al plano y a las tarjetas, incluidos los "Para llevar" activos).
2. **Pedido ajeno por URL (o por una carrera de 409):** la pantalla del pedido muestra un aviso de "pedido ajeno" y queda **en solo lectura**: menú deshabilitado, sin carrito editable, sin «Enviar pedido», sin «Pedir cuenta / Reabrir / Anular» ni «Entregado».
3. **Pedido propio y jefatura:** igual que siempre.
4. El salón sigue mostrando todas las mesas con su estado y quién las atiende; solo cambia lo que se puede tocar.

## Experiencia

| Tema | Decisión |
|---|---|
| ¿Quién es jefe? | `panel.ver` o `restaurante.mesas.gestionar`; el servidor lo recalcula igual |
| Aviso al tocar | Toast `warning` con el nombre del dueño; la mesa no se abre |
| Pedido ajeno | Banner gris arriba ("Este pedido lo abrió X") y controles apagados; la carta se ve, no se toca |
| Descarte en cero | No aplica a pedidos ajenos (solo el dueño puede anularlo al salir) |
| Mis órdenes | Sin cambios: solo las propias (spec 024) |
| Permisos | El frontend solo mejora la experiencia: la última palabra siempre es del servidor (403 `PEDIDO_AJENO`) |

## Tareas

- [x] `pedidos/page.tsx` pasa el usuario actual (id + si es jefatura) al salón
- [x] `tap()`/tarjetas bloquean mesas ajenas con el aviso del dueño
- [x] `[id]/page.tsx` pasa el usuario; vista de pedido ajeno en solo lectura con banner
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
