# 008 — Frontend

## Para quién y dónde

Mozo con celular en pleno servicio y cocina con tablet: abrir la app debe sentirse inmediato y un pedido ajeno no debe provocar recargas visibles.

## Flujo

1. Al abrir `/panel`, `createEcho` agrupa las autorizaciones que pide Pusher en una ventana de ~20 ms y las envía en **una** petición a `/api/broadcasting/auth/lote`.
2. Llega `PedidoActualizado` / `PlatoListo` de otra persona:
   - Estado `CERRADO` o `ANULADO` → se quita de la lista de pedidos en caché.
   - Versión ya conocida (caché ≥ evento) → no se hace nada.
   - Si no → se pide **solo ese pedido** y se actualizan su detalle y su fila en la lista.
3. Los planos de salón (`["salones", id, "plano"]`) ya no se invalidan por pedidos.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Sin cambios: esqueleto del salón |
| Error de un canal | El canal queda sin suscribir; el resto sigue en vivo; al reconectar se reintenta |
| Mesa libre | Sin pedido activo → libre salvo `BLOQUEADA`; ya no depende de `mesa.estado` del plano en caché |
| Reconexión | Sin cambios (spec 005) |

## Tareas

- [x] Autorización por lote en `lib/realtime.ts`
- [x] `applyOrderEvent` en `pedidos/queries.ts` y uso desde `realtime.tsx`
- [x] No invalidar `["salones"]` por `PedidoActualizado`
- [x] Mesa libre derivada de los pedidos en `salon-view.tsx`
- [x] `npm run lint` y `npx tsc --noEmit` sin errores
- [x] Verificación manual: abrir el panel con DevTools y comprobar una sola petición a `broadcasting/auth/lote`; abrir/cerrar un pedido desde otro dispositivo y ver una sola petición `pedidos/{id}`
