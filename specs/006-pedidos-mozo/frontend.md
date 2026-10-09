# 006 — Frontend

Sigue el skill `front-next/.agents/skills/softflyer-ui` y la biblioteca `@/components/ui` (el pulido visual lo hace el agente de diseño). **Contexto POS:** botones de 48–56px, tipografía grande, una mano.

## Para quién y dónde

**El mozo**, con el celular (o una tablet compartida) en plena hora punta: camina, le hablan, tiene una mano ocupada. Cada toque cuenta y nada puede esperar al servidor.

## Flujo

1. **Salón** (`/panel/pedidos`): mesas como botones grandes agrupados por salón (en tablet o PC, opción de ver el plano). Color por estado: libre, ocupada (con número de pedido, tiempo y total), por cobrar. Arriba, "Para llevar".
2. **Mesa libre** → un toque abre el pedido (comensales opcional, se puede saltar) y entra a la pantalla del pedido.
3. **Mesa ocupada** → entra a su pedido. Si al abrir otro mozo se adelantó (409), entra directo al pedido existente.
4. **Pedido**: arriba la mesa, número y total; la carta en chips de categoría + buscador + platos en botones grandes con precio.
   - Toca un plato sin opciones → se suma al **carrito** (0 ms). Tocar de nuevo suma cantidad.
   - Plato con modificadores → hoja inferior para elegirlos (obligatorios marcados), cantidad y nota → "Agregar".
5. **Carrito** (barra inferior fija con contador y monto): abrir para ajustar cantidades, notas o quitar; botón grande **Enviar a cocina**.
6. Tras enviar: los platos pasan a "Enviados" con su estado de cocina (pendiente, en preparación, listo, entregado).
7. Acciones del pedido: **Pedir cuenta**, **Reabrir**, **Anular pedido** (solo sin envíos) y, con permiso, **Anular plato** enviado con motivo.

## Experiencia

| Tema | Decisión |
|---|---|
| Latencia | Carta descargada una vez (GET `/carta` con ETag); carrito 100 % local; un solo envío |
| Carrito | Se guarda en el dispositivo por pedido: si se recarga la página o se va la señal, no se pierde |
| Envío | `Idempotency-Key` generada una vez por tanda: si la red falla, "Reintentar" usa la misma clave y la cocina no recibe doble |
| Tiempo real | `PedidoActualizado` refresca el salón y el pedido abierto; los propios eventos se ignoran |
| Estados | Colores + texto (no solo color) para accesibilidad |
| Celular | Una columna; carrito como barra inferior; hojas inferiores para modificadores y carrito |
| Tablet/PC | Carta y pedido lado a lado |
| Errores | Producto agotado entre que se cargó la carta y se envió → aviso claro y el plato queda marcado en el carrito |

## Tareas

- [x] Esquemas Zod del contrato (pedido, resumen, envío)
- [x] Consultas y mutaciones: pedidos activos, pedido, abrir (idempotente), enviar (idempotente), cuenta, reabrir, anular, anular plato
- [x] Menú "Pedidos" para `restaurante.pedidos.crear`
- [x] Vista Salón: mesas por salón con estado, "Para llevar", tiempo real
- [x] Pantalla del pedido: carta en chips + buscador + botones; hoja de modificadores
- [x] Carrito local persistente y "Enviar a cocina" con reintento seguro
- [x] Platos enviados con estado de cocina; acciones del pedido y anulación con motivo
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-08)

- Código: `src/lib/schemas/pedidos.ts`, `src/app/panel/pedidos/{page, salon-view, [id]/page, order-view, menu-picker, cart-store, queries, use-now}`; `PedidoActualizado` escuchado en `realtime.tsx`; "Pedidos" en el menú.
- Carrito en `useSyncExternalStore` + `localStorage` (sin desajuste al hidratar). Si un envío no se confirma por red, el carrito queda bloqueado con "Reintentar envío" y la misma `Idempotency-Key`; si el servidor respondió (4xx), la clave se descarta y los platos con error quedan en rojo.
- **E2E en la demo** (servidores reales + cliente Node suscrito al canal de cocina vía el proxy): abrir 201; segunda apertura de la misma mesa 409 `MESA_OCUPADA` con el pedido existente; enviar 201 con comandas por estación; **comanda recibida en cocina a los 342 ms** (antes de que el mozo recibiera la respuesta, 406 ms, en `php artisan serve`); reintento con la misma clave → respuesta repetida y sin duplicar; `/panel/pedidos` y `/panel/pedidos/{id}` 200. Datos de prueba borrados.
- `tsc`, `npm run lint` y `check_ui.py` sin errores. Revisión visual en navegador: delegada al agente de diseño (reiniciar `npm run dev` para tomar las variables `NEXT_PUBLIC_REVERB_*`).
- **Corrección (2026-10-08):** la pantalla del pedido fallaba con "expected array, received object" en `categorias.N.producto_ids`. Era `GET /carta` (spec 002): el filtro de la colección conservaba índices y PHP los serializaba como objeto JSON. Se corrigió con `values()` en `GetMenu` y se agregó la prueba de regresión `test_menu_product_ids_are_always_json_arrays` (suite: 103 en verde).
