# 009 — Frontend

## Para quién y dónde

El cajero, en la computadora o tablet del mostrador, durante el servicio y al cerrar el día. Cobra con una mano mientras atiende al cliente: poco texto, montos grandes, teclado numérico.

## Flujo

1. `/panel/caja` sin turno: pantalla "Abre tu caja" con el monto inicial (teclado numérico) y un botón grande.
2. Con turno: lista de **pedidos por cobrar** (mesa, mozo, minutos esperando, total), el más antiguo primero, que se actualiza solo.
3. Tocar un pedido abre el cobro: platos con casilla (para dividir), total, y métodos de pago como botones grandes. Efectivo pide "recibido" y muestra el vuelto al instante.
4. Pago mixto: agregar otro método con "Falta S/ 15.50" precargado.
5. "Cobrar" confirma; la mesa pasa a libre y el pedido sale de la lista.
6. Cabecera con el turno: efectivo esperado, ingresos/egresos, botón "Cerrar caja" (arqueo: esperado, contado, diferencia).

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueletos de la lista; el botón Cobrar se deshabilita mientras envía |
| Vacío | "No hay cuentas por cobrar" y aviso discreto de que llegan solas |
| Error | `mensaje` de la API; `PAGO_NO_CUBRE_TOTAL` marca cuánto falta; `CONFLICTO_VERSION` recarga el pedido |
| Doble toque | Una `Idempotency-Key` por intento, conservada hasta que termine bien (como el envío a cocina) |
| Tiempo real | Lista y resumen reaccionan a `PedidoActualizado` y `CajaActualizada`, con la política de la spec 008 |
| Celular | Usable, pero el diseño prioriza tablet y escritorio |
| Accesibilidad | Foco en monto recibido, Enter confirma, objetivos táctiles de 44–48 px |
| Mozo | No ve "Caja" en el menú (permiso `caja.abrir`) |

## Tareas

- [x] Ruta `/panel/caja` y enlace en el menú (hoy es solo un marcador)
- [x] Apertura de turno y resumen
- [x] Lista de pedidos por cobrar en tiempo real
- [x] Pantalla de cobro: división, mixto, vuelto
- [x] Movimientos manuales y cierre con arqueo
- [x] `npm run lint` y `npx tsc --noEmit` sin errores
- [ ] Verificación manual en navegador (ver abajo)

## Cierre del frontend (2026-10-12)

- Código: `app/panel/caja/{page, cash-view, charge-drawer, turn-actions, queries}.tsx`, `lib/schemas/caja.ts`; `pedidos.ts` suma `pendiente` y `cobrado`; el menú "Caja" ya tiene ruta; `CajaActualizada` en `realtime.tsx`.
- El tiempo real de caja usa `watch("sucursal.{id}.caja")` (como la cocina) y `PedidoActualizado` para la lista por cobrar.
- `npx tsc --noEmit` sin errores; `npm run lint` sin errores (3 avisos previos en `plano/floor-shapes.tsx`); `check_ui.py` sin avisos en `caja/`.

### Verificación manual pendiente

1. Entrar como administrador o cajero en `/panel/caja`: se pide el monto inicial; abrir caja.
2. Con un mozo en otra ventana: pedir la cuenta de una mesa → aparece en "Por cobrar" al instante.
3. Cobrar con efectivo (recibido mayor) y ver el vuelto; la mesa queda libre en el salón del mozo.
4. Cuenta dividida: elegir un plato, cobrar; el pedido sigue en "Por cobrar" con lo pendiente.
5. Movimiento manual y cierre con un contado distinto: ver la diferencia.
