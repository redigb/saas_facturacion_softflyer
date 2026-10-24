# 021 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, sin diálogos nativos).

## Flujo

1. **Agregar, agregar:** cada toque sobre un plato lo suma a la línea del carrito sin esperar al servidor. Repetido con las mismas opciones y la misma observación → sube la cantidad; con notas distintas → línea aparte.
2. **Observación:** en cualquier línea, «+ Observación» abre un campo en la misma fila (placeholder «Ej. sin hielo, sin arroz»); «Listo» guarda, «No» cancela, borrar el texto la quita. Si la línea ya tiene nota, se toca la nota para editarla.
3. **Enviar:** «Enviar a cocina» manda la tanda completa una sola vez; cada estación recibe su comanda con las notas de sus platos.

## Experiencia

| Tema | Decisión |
|---|---|
| Repetidos | La suma compara plato + opciones + observación; es local y de 0 ms |
| Nota en la línea | Botón chiquito azul cuando existe («“sin hielo” · editar»), gris cuando no («+ Observación»); mientras se edita, input + «Listo» / «No» |
| Envío en curso | Con `pendingKey` la línea queda bloqueada (no se edita ni se quita) |
| Enviados | La nota se sigue mostrando en la lista de «Enviados» (spec 006) |
| Celular | Idéntico dentro de la pestaña Pedido; el input respeta el alto táctil de la casa |
| Errores | Si el envío falla, las líneas quedan en rojo como siempre; la nota no se pierde |

## Tareas

- [x] `addLine`: sumar también cuando la observación es la misma (quitar la exigencia de nota vacía)
- [x] Nota editable en cualquier línea del carrito (agregar, editar, quitar)
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
