# 005 — Backend

## Contrato

### Autorización de canales

`POST /api/v1/broadcasting/auth` — subdominio del inquilino, `Authorization: Bearer`. Cuerpo `{ "socket_id": "...", "channel_name": "private-sucursal.1.salon" }`. Responde la firma de Reverb (protocolo Pusher) o **403**.

| Canal | Quién se suscribe |
|---|---|
| `sucursal.{sucursal}.salon` | Cualquier usuario con un rol en esa sucursal (o en todas) |
| `sucursal.{sucursal}.estacion.{estacion}` | Con `restaurante.cocina.actualizar_estado` o `panel.ver`, en esa sucursal; la estación debe ser del restaurante |
| `sucursal.{sucursal}.mozo.{usuario}` | Solo ese mismo usuario, si trabaja en esa sucursal |

La sucursal siempre se busca dentro del restaurante del subdominio (RLS): un id de otro restaurante no existe → 403.

### Eventos

Llevan solo ids y versión; la pantalla vuelve a pedir el dato por la API (Doc. 09 §3.5).

| Evento (`broadcastAs`) | Canal | Cuerpo |
|---|---|---|
| `PlanoActualizado` | `sucursal.{id}.salon` | `{ "salon_id": 1, "version": 4, "usuario_id": 2 }` |
| `CartaActualizada` | `sucursal.{id}.salon` de cada sucursal del restaurante | `{ "usuario_id": 2 }` |

- `usuario_id` = quien hizo el cambio (su propia pantalla lo ignora).
- `CartaActualizada` se emite al crear, editar, borrar o reordenar categorías, productos, estaciones o grupos de modificadores.

### `GET /auth/yo` (se amplía)

Se agrega `sucursales: [{ "id": 1, "nombre": "Local principal" }]`: las sucursales donde trabaja el usuario (todas si su rol es global). El frontend las necesita para suscribirse.

## Decisiones

- **Emisión directa** (`ShouldBroadcastNow`) y **después del commit**: sin cola de por medio (la cola `database` añade ~3 s, Doc. 09 §3.7) y sin avisar de algo que luego se deshace.
- **Un fallo de Reverb nunca rompe la operación**: los eventos implementan `ShouldRescue` (Laravel registra el error en el log y sigue) y el cliente HTTP hacia Reverb espera como máximo 1 s para conectar y 2 s en total.
- **Solo el servidor emite**: `accept_client_events_from = none`; un dispositivo no puede enviar eventos a los demás por el canal. `REVERB_ALLOWED_ORIGINS` limita los orígenes en producción.
- Canales privados autorizados en Laravel con las mismas reglas de inquilino y sucursal que la API.

## Tareas

- [x] Instalar `laravel/reverb`; `config/broadcasting.php` y `config/reverb.php`; variables en `.env.example`
- [x] Ruta `broadcasting/auth` bajo `/api/v1` con `inquilino` + `auth:sanctum`
- [x] Canales y sus reglas de autorización
- [x] Eventos tolerantes a fallos (`ShouldRescue` + tiempos de espera cortos)
- [x] Eventos `PlanoActualizado` y `CartaActualizada`, emitidos desde los controladores de plano y carta
- [x] `sucursales` en `GET /auth/yo`
- [x] Pruebas: autorización (permitido, otra sucursal, otro restaurante, mozo ajeno, sin sesión), eventos en el canal correcto con el cuerpo esperado, operación exitosa con Reverb caído
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: `Modules/Restaurant/Infrastructure/Realtime/{FloorPlanUpdated, MenuUpdated}`, `Presentation/channels.php` (cargado por `RestaurantServiceProvider`), middleware `notifica.carta`, ruta `broadcasting/auth` en `Core/Iam`, `User::branches()` y `worksAt()`, `sucursales` en `/auth/yo`.
- Pruebas: `tests/Feature/Restaurant/RealtimeTest.php` (8 casos). Suite: 92 en verde como `softflyer_app`.
- Con Reverb caído, cada escritura puede tardar hasta ~1 s más (`connect_timeout`): aceptable para carta y plano; para comandas (H1) se revisará.
