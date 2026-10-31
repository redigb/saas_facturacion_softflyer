# 007 — Frontend

Sigue el skill `front-next/.agents/skills/softflyer-ui` y la biblioteca `@/components/ui` (el pulido visual lo hace el agente de diseño). **Contexto cocina:** tablet o monitor táctil a distancia, calor, manos húmedas o con guantes: botones de 56px o más, texto grande, alto contraste.

## Para quién y dónde

- **Cocinero / bartender:** pantalla fija en su estación, mirándola de reojo mientras cocina.
- **Mozo:** su celular; recibe "plato listo" y marca "entregado".

## Flujo

**Cocina** (`/panel/cocina`):
1. Primera vez: elige su estación (Cocina, Bar… o General); queda recordada en ese dispositivo.
2. Tablero de tarjetas, la comanda más antigua a la izquierda/arriba. Cada tarjeta: mesa o "para llevar", #pedido, mozo, minutos (ámbar desde 10, **rojo desde 15** —spec 038—) y sus platos.
3. Toque en un plato: en cola → preparando → listo. Botón grande **Todo listo** en la tarjeta.
4. Comanda completa → pasa a la franja "Recién listos" (10 min) con **Deshacer**.
5. Comanda nueva: entra resaltada unos segundos y suena un aviso (si el cocinero activó el sonido).
6. Plato anulado: aparece tachado en rojo al instante.

**Mozo**:
- Aviso "Mesa M4: 2× Lomo saltado listo" donde esté dentro del panel, con acceso al pedido.
- En el pedido, los platos listos tienen botón **Entregado**.

## Experiencia

| Tema | Decisión |
|---|---|
| Latencia | La comanda llega por WebSocket; el tablero se vuelve a pedir al instante |
| Toques | Optimistas: el plato cambia de color en 0 ms y se revierte con aviso si falla |
| Sonido | Apagado por defecto (los navegadores exigen un toque); botón "Activar sonido" |
| Legibilidad | Cantidad grande, notas y opciones resaltadas; sin precios |
| Pantalla | Pensada para quedarse abierta todo el turno; se reconecta sola (spec 005) |

## Tareas

- [x] Esquemas Zod del contrato (comanda KDS, aviso PlatoListo)
- [x] Tiempo real: suscripción dinámica al canal de la estación y al canal personal del mozo
- [x] Menú "Cocina" para `restaurante.cocina.actualizar_estado`
- [x] Selector de estación recordado en el dispositivo
- [x] Tablero: tarjetas por antigüedad, minutos con alerta, toques optimistas, "Todo listo", franja de recién listos con deshacer
- [x] Comanda nueva resaltada y sonido opcional; platos anulados tachados
- [x] Mozo: aviso "plato listo" y botón "Entregado" en el pedido
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-08)

- Código: `src/lib/schemas/cocina.ts`, `src/app/panel/cocina/{page, kitchen-board, queries}`; `realtime.tsx` ahora suscribe canales extra con `watch()` (el KDS escucha su estación) y el canal personal del mozo (`PlatoListo` → aviso con "Ver"); botón **Entregado** en `order-view.tsx`; "Cocina" en el menú.
- Si el tiempo real se cae, el tablero se repide cada 15 s hasta que vuelva (degradación; con conexión no hay sondeo).
- **E2E del circuito completo en la demo** (cliente Node como KDS en el canal de la estación y como mozo en su canal personal, ambos autorizados por el proxy): **mozo → cocina 399 ms**; tablero con mesa, cantidad, opciones y sin precios; **cocina → mozo ("2× Lomo saltado", mesa M1) 371 ms**; entregado 200 y la comanda sale del tablero; `/panel/cocina` y `/panel/pedidos/{id}` 200.
- **Incidente:** el script de limpieza de esta prueba borró 7 pedidos de la demo en vez de solo el suyo (6 eran pruebas manuales hechas en el navegador al mismo tiempo); no se pueden recuperar. El script se corrigió para borrar solo lo creado por la sesión de prueba.
- `tsc` y `eslint` de los archivos de esta spec y `check_ui.py` sin errores. `plano/floor-editor.tsx` no compila por una reorganización en curso del agente de diseño (no es de esta spec).
