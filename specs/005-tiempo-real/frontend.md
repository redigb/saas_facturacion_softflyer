# 005 — Frontend

Sigue el skill `front-next/.agents/skills/softflyer-ui` y la biblioteca `@/components/ui` (el pulido visual lo hace el agente de diseño).

## Para quién y dónde

Todos los que tienen una pantalla abierta: hoy el dueño y el encargado (carta, plano); desde H1 el mozo y la cocina. No tienen que hacer nada: las pantallas se actualizan solas.

## Flujo

1. Al entrar al panel, el dispositivo abre una conexión con Reverb y se suscribe a `sucursal.{id}.salon` de sus sucursales.
2. Llega `CartaActualizada` de otra persona → la carta abierta se vuelve a pedir y se ve el cambio.
3. Llega `PlanoActualizado` de otra persona:
   - si el plano abierto no tiene cambios sin guardar → se recarga solo;
   - si tiene cambios → aviso "Otra persona guardó este plano" con **Ver su versión** (descarta lo local) o **Seguir editando** (al guardar recibirá el 409 de siempre).
4. Si se corta la conexión, un indicador en la cabecera dice "Reconectando…"; al volver, se vuelven a pedir los datos abiertos.

## Experiencia

| Tema | Decisión |
|---|---|
| Indicador | Punto verde "En vivo" / ámbar "Reconectando…" en la cabecera; discreto, sin bloquear nada |
| Sin conexión | Todo sigue funcionando por la API; solo se pierden los avisos instantáneos |
| Reconexión | Reintentos automáticos de Echo/Pusher con espera creciente; al reconectar se invalidan las consultas abiertas |
| Cambios propios | Se ignoran los eventos con mi `usuario_id` (ya tengo el dato) |
| Token | La autorización del canal va por el proxy `/api/broadcasting/auth`: el token sigue en la cookie httpOnly |

## Tareas

- [x] Instalar `laravel-echo` y `pusher-js`; variables `NEXT_PUBLIC_REVERB_*`
- [x] Proveedor de tiempo real en el panel: conexión, suscripción a las sucursales del usuario, autorización por el proxy
- [x] Indicador "En vivo / Reconectando" en la cabecera
- [x] Carta: invalidar consultas con `CartaActualizada`
- [x] Plano: recargar o avisar con `PlanoActualizado`
- [x] Reconexión: invalidar las consultas abiertas
- [x] Script de carga k6 (`tests/carga/reverb.k6.js`) y medición local de latencia
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-08)

- Código: `src/lib/realtime.ts` (Echo + autorización por el proxy), `src/app/panel/realtime.tsx` (proveedor, `useRealtimeEvent`, `RealtimeIndicator`), reacción del plano en `floor-editor.tsx`; la carta se invalida sola con `CartaActualizada`.
- **Medición local** (`tests/carga/latencia.js`, 50 clientes reales autorizados por el proxy de Next, 5 guardados de plano): aviso recibido en **p50 251 ms, p95 377 ms**, siempre a la par de la respuesta HTTP: casi todo es la propia petición en `php artisan serve`; Reverb agrega unos pocos ms. Objetivo < 1 s cumplido.
- Conectar y autorizar a 50 clientes tomó 10 s en local: `php artisan serve` atiende de a una petición. En staging (PHP-FPM) hay que medir la tormenta de reconexión (Doc. 09 §5.2) con `reverb.k6.js` y el script de latencia.
- **Para verlo en el navegador** hay que reiniciar `npm run dev` (las variables `NEXT_PUBLIC_*` se leen al arrancar) y tener `php artisan reverb:start` corriendo. No se pudo comprobar en un navegador en esta sesión.
- Pulido visual del indicador "En vivo": delegado al agente de diseño.
