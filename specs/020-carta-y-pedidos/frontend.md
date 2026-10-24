# 020 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, `tabular-nums`, sin diálogos nativos).

## Flujo

1. **Carta, formulario del plato:** «¿A qué estación va?» queda en el formulario principal, debajo de Categoría, con el selector de siempre («La de su categoría» o una estación concreta: Cocina, Bar, Cocina 02…). «Más opciones» pasa a agrupar solo tipo, descripción y modificadores.
2. **Carta, lista:** cada plato sigue mostrando su estación efectiva.
3. **Pedidos, menú del mozo:** cada tarjeta muestra la categoría arriba (10px, mayúsculas), el nombre, la descripción en letra chica (11px, máximo 2 líneas) y el precio; «opciones» queda como aviso chiquito cuando el plato tiene modificadores.
4. **Pedido en cero:** al tocar «Volver al salón», si el pedido no tiene platos activos (nada enviado sin anular) y el carrito está vacío, se anula solo y la mesa (si es de salón) queda libre. La pantalla no espera: el descarte viaja en segundo plano y el salón se refresca con la invalidación de siempre.

## Experiencia

| Tema | Decisión |
|---|---|
| Estación en el formulario | Misma regla y mismo control; solo cambia de lugar. El aviso «Si no eliges, va a X (la de su categoría)» se mantiene |
| Tarjeta del plato | Categoría arriba en 10px gris; descripción en 11px con `line-clamp-2`; si no hay descripción, la tarjeta queda como antes (nombre + precio) |
| Pedido en cero | No se anula si hay envío en curso (`pendingKey`), si hay platos activos o si el carrito tiene líneas: el carrito manda |
| Mesa en cero | Al anularse el pedido, la mesa queda libre y el plano se repinta con los datos de siempre (invalidación de React Query) |
| Avisos | Sin toasts nuevos: el descarte es silencioso; los errores del API (si los hubiera) se ignoran y el pedido queda como estaba |
| Accesibilidad | Todo sigue siendo botones y etiquetas; la descripción es texto plano |

## Tareas

- [x] Mover «¿A qué estación va?» al formulario principal y ajustar «Más opciones»
- [x] Añadir `descripcion` al esquema del menú y pintar categoría + descripción en la tarjeta
- [x] Extender el descarte del pedido en cero: mesa, para llevar y todo anulado; nunca con carrito con líneas
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
