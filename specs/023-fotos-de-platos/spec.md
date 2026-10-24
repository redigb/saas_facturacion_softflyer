# 023 — Fotos de los platos (compresión estilo WhatsApp)

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (mejora pedida por el negocio)
**Documentos:** specs 002 y 020

## Qué y por qué

El negocio quería que cada plato pueda llevar su foto, subida por el admin. Para no inflar la base ni la red, la foto se **comprime en el navegador antes de subir**, con el criterio estilo WhatsApp: redimensionar por píxeles al lado mayor y reencodar en JPEG — sin pérdida visible para el ojo.

1. **Compresión en el dispositivo:** la foto se reescala a un máximo de **1600 px** del lado mayor y se reencoda a **JPEG ~82 %** con fondo blanco (los PNG con transparencia no salen negros). El formulario muestra el ahorro: «818 KB → 271 KB · 1600×1067 px».
2. **Subida y borrado:** `POST /productos/{id}/imagen` (multipart) y `DELETE /productos/{id}/imagen`. Al reemplazar se borra el archivo anterior; el servidor valida igual (imagen real JPG/PNG/WebP, ≤ 4 MB).
3. **Que se vea:** la foto aparece en la lista y las tarjetas de la Carta (avatar real), en el formulario (preview) y **en la tarjeta del plato en el menú del mozo**.
4. **Bug del proxy corregido:** el proxy `/api/...` pasaba el cuerpo con `request.text()`, que corrompe binarios; ahora pasa los bytes intactos (`arrayBuffer`).

## Criterios de aceptación

- [x] En el formulario del plato se elige una foto; se comprime en el navegador (≤ 1600 px, JPEG) y se muestra el aviso con el antes → después y las dimensiones.
- [x] Guardar el plato sube la foto; la respuesta y el menú (`GET /carta`) incluyen `imagen_url`.
- [x] La foto se ve en: la fila/tarjeta de la Carta, el preview del formulario y la tarjeta del plato en Pedidos.
- [x] «Quitar» borra la foto (archivo + ruta) y deja el avatar genérico.
- [x] Reemplazar la foto borra el archivo anterior (no se acumula basura).
- [x] El servidor rechaza archivos que no sean imagen o que superen 4 MB (422 `VALIDACION`).
- [x] Permisos: subir o quitar foto usa `productos.crear|productos.editar`; el mozo no puede.
- [x] Un inquilino no puede tocar la foto de otro (404).
- [x] Pruebas del backend en verde + E2E con una foto real (compresión verificada en disco).

## Fuera de alcance

- Editor con recorte (crop) o filtros.
- Varias fotos por plato.
- Fotos subidas por el comensal (QR) — futuro.
- CDN/S3 de producción (se usa el disco `public` local; en despliegue se reemplaza el disco).

## Cierre (2026-10-13)

- Backend: rutas `POST/DELETE /productos/{id}/imagen` (multipart, permisos `productos.crear|productos.editar`, bajo `notifica.carta`), `ManageMenu::setProductImage/clearProductImage` (borra el archivo anterior al reemplazar), `imagen_url` en `MenuPresenter` y en `GET /carta`; `php artisan storage:link` creado y documentado. Suite completa: **140 pruebas (1071 aserciones)** en verde, incluida `ProductImageTest` (subida, reemplazo, borrado, 422, 403 del mozo, 404 entre inquilinos).
- Frontend: `lib/compress-image.ts` (lado mayor 1600 px, JPEG 82 %, fondo blanco, 100 % en el dispositivo), `apiUpload` en `browser-api`, **proxy corregido** (`request.text()` → `request.arrayBuffer()`: antes corrompía cualquier binario), campo «Foto del plato» en el formulario (elegir/comprimir/preview/quitar) y fotos visibles en la carta (avatar real) y en el menú del mozo.
- E2E con navegador real (demo): foto de prueba de 3000×2000 (**818 KB**) → el formulario mostró **«Compresión lista: 818 KB → 271 KB · 1600×1067 px»**; guardada: `imagen_ruta` en la base y archivo de **271 KB** en disco (la URL `/storage/...` responde 200); se vio en la lista de la Carta, en el preview y en la tarjeta del menú del mozo; «Quitar» + Guardar dejó `imagen_ruta` en NULL y borró el archivo.
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): la foto de prueba se quitó; el pedido de prueba (21) se anuló solo al salir y se borró; la demo quedó como estaba.
