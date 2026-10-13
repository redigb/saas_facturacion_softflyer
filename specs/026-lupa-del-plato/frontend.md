# 026 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, sin diálogos nativos).

## Flujo

1. En el menú del pedido, cada tarjeta con foto muestra una **lupa** flotando sobre la esquina de la imagen.
2. Un toque en la lupa abre el **modal de la foto**: imagen grande (`object-contain`, sin recortes), nombre, precio y descripción.
3. Cerrar: X, tocar fuera o Escape. El flujo de pedido no cambia: el resto de la tarjeta sigue agregando al carrito.

## Experiencia

| Tema | Decisión |
|---|---|
| Lupa | Botón circular (40px) blanco translúcido con blur sobre la imagen; `aria-label="Ver foto de {plato}"`; solo cuando hay imagen |
| Antinesting | La lupa es **hermana** de la tarjeta (no dentro del botón de agregar): nada de botones anidados y el toque no se propaga |
| Modal | `fixed inset-0 z-50`, backdrop `bg-tinta/60` con blur; panel blanco `max-w-2xl` centrado en tablet/PC y hoja inferior en celular (mismo patrón de la hoja de modificadores) |
| Imagen | `max-h-[70vh] w-full object-contain` sobre fondo claro: se ve el plato completo, apto para girar la pantalla al cliente |
| Cierre | X, clic fuera y Escape (listener con limpieza) |
| Sin foto | Sin lupa, tarjeta idéntica a hoy |

## Tareas

- [x] Lupa en las tarjetas con foto (hermana del botón de agregar)
- [x] Modal `PhotoModal` con imagen grande, nombre, precio y descripción, y cierre por X/fuera/Escape
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores
