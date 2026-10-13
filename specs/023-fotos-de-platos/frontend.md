# 023 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, sin diálogos nativos).

## Flujo

1. **Elegir y comprimir:** en el formulario del plato, «Foto del plato» → «Elegir foto». La imagen se comprime en el mismo dispositivo (canvas: máx. 1600 px del lado mayor, JPEG ~82 %, fondo blanco) y aparece el preview con el ahorro: «818 KB → 271 KB · 1600×1067 px».
2. **Guardar:** al guardar el plato se sube la foto (`productos/{id}/imagen`). Si el plato ya tenía foto y se elige otra, se reemplaza; «Quitar» borra la foto guardada.
3. **Verse:** la foto aparece en la lista y las tarjetas de la Carta (avatar), en el propio formulario y en la tarjeta del plato del menú del mozo.
4. **Fallo de foto:** si el plato se guardó pero la foto falló, un aviso lo dice y el plato queda guardado (no se pierde nada).

## Experiencia

| Tema | Decisión |
|---|---|
| Compresión | En el navegador, instantánea y sin servidor: `canvas` + JPEG 82 % + fondo blanco (transparencias no salen negras) |
| Aviso del ahorro | «original → comprimida · ancho×alto px» en el formulario; es la prueba visible del algoritmo |
| Preview | Miniatura 144×96 redondeada; sin foto, un recuadro punteado con el ícono del plato |
| Subida | `FormData` por el proxy (que ahora pasa bytes intactos); el avatar y el menú se refrescan con la invalidación de siempre |
| Errores | 422 del servidor con su mensaje; si el guardado del plato funcionó, el error de foto es un toast aparte |
| Permisos | Los mismos de la carta: quien puede editar platos puede poner foto; el mozo no ve los controles |
| Rendimiento | `loading="lazy"` en todas las fotos; el menú del mozo ya recibe imágenes chicas |

## Tareas

- [x] `lib/compress-image.ts`: reescalado por píxeles + JPEG, con `formatBytes`
- [x] `apiUpload` en `browser-api` y proxy con cuerpo binario (`arrayBuffer`)
- [x] Campo «Foto del plato» en el formulario (elegir/comprimir/preview/quitar) y subida al guardar
- [x] `useSaveProductImage` / `useClearProductImage` con actualización de caché y `refreshMenu`
- [x] Fotos visibles: avatar real en la Carta, imagen arriba en la tarjeta del menú del mozo
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
