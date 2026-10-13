# 023 — Backend

## Contrato

**Se amplía el contrato de la spec 002** (anotado también en `specs/002-carta/backend.md`): el producto incluye `imagen_url` y gana dos rutas de foto.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| POST | `/productos/{id}/imagen` | `productos.crear\|productos.editar` | 200 producto (con `imagen_url`) |
| DELETE | `/productos/{id}/imagen` | `productos.crear\|productos.editar` | 200 producto (sin foto) |

Ambas van bajo `notifica.carta`: la foto también avisa al tiempo real para que los dispositivos refresquen el menú.

### POST `/productos/{id}/imagen` — subir o reemplazar

- Multipart con el campo `imagen`: archivo **JPG, PNG o WebP**, **≤ 4 MB**. El cliente ya comprime (≤ 1600 px, JPEG); el servidor valida igual.
- Reemplazo: si el producto ya tenía foto, su archivo se borra antes de guardar el nuevo.
- El archivo se guarda en el disco `public`, bajo `productos/{inquilino_id}/`. En local requiere `php artisan storage:link` (documentado en el README del backend).
- Respuesta: el producto completo con `imagen_url` (URL absoluta, `APP_URL/storage/...`).

### DELETE `/productos/{id}/imagen`

- Borra el archivo y deja `imagen_ruta = null`. Responde 200 con el producto (para refrescar la pantalla en un solo viaje).

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `VALIDACION` | No es imagen, formato no permitido o supera 4 MB (`detalles.imagen`) |
| 404 | `RECURSO_NO_ENCONTRADO` | Producto de otro inquilino |

### `GET /carta` y recurso de producto

- `imagen_url` (nullable) viaja en el producto del menú del mozo y en la lista de productos de la carta.

## Decisiones

- **La compresión vive en el cliente** (canvas, estilo WhatsApp) para ahorrar ancho de banda y almacenamiento; el servidor no re-procesa: solo valida. Así el VPS no carga con procesamiento de imágenes.
- **Reemplazo que borra el anterior:** sin esto, cada cambio de foto dejaría archivos huérfanos creciendo para siempre.
- Disco `public` local por ahora (`FILESYSTEM_DISK` sigue en `local` para el resto): en producción se cambia el disco sin tocar el contrato.

## Tareas

- [x] Rutas `POST/DELETE /productos/{id}/imagen` bajo `notifica.carta` con permisos `productos.crear|productos.editar`
- [x] `ManageMenu`: guardar (reemplazando y borrando la anterior) y limpiar foto
- [x] `imagen_url` en `MenuPresenter` y en `GET /carta`
- [x] Pruebas: subida feliz (+ menú), reemplazo borra la anterior, borrado limpia archivo y ruta, 422 (no imagen / > 4 MB), mozo 403, otro inquilino 404
- [x] Pruebas en verde (`php artisan test` — 140 en verde, 2026-10-13)
