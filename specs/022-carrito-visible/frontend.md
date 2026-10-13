# 022 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, `tabular-nums`).

## Flujo

1. El mozo abre una mesa o un para llevar y toca platos: el **carrito** (columna derecha desde 768px; pestaña «Pedido» en celular) los va listando.
2. Revisa cada línea (nombre, opciones, observación, cantidad y subtotal) y ajusta cantidades u observaciones.
3. Cuando todo está conforme, toca el botón grande **«Enviar pedido»**: cada estación recibe su comanda y las líneas pasan a «Enviados».

## Experiencia

| Tema | Decisión |
|---|---|
| Visibilidad | Dos columnas desde `md` (768px): carta a la izquierda, carrito a la derecha con `sticky`; el ancho del carrito crece en `lg` (340px → 400px) |
| Título | «Carrito» + «N platos · S/ total» en `tabular-nums`; debajo, una línea de ayuda («Revisa tu pedido y envíalo: cada estación recibirá lo suyo») |
| Vacío | «Tu carrito está vacío — toca los platos de la carta para agregarlos y envíalos al final» |
| Líneas | Nombre + opciones + observación editable + cantidad + **subtotal** a la derecha |
| Botón | «Enviar pedido» (con «Reintentar envío» cuando hay clave pendiente); aviso «Pedido enviado.» |
| Celular | Pestañas «Carta / Pedido» y barra inferior «Ver carrito · N platos · S/ …» (sin cambios, movidas a `md`) |

## Tareas

- [x] Columna del carrito desde 768px con sticky y ancho escalonado
- [x] CartPanel: título «Carrito», contador + total, estado vacío claro y botón «Enviar pedido»
- [x] Subtotal por línea del carrito
- [x] Pestañas/barra inferior movidas a `md` para que no se solapen con la columna nueva
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
