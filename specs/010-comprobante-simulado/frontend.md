# 010 — Frontend

## Para quién y dónde

El cajero en el mostrador, justo después de cobrar: tiene al cliente enfrente y quiere entregarle su comprobante sin pasos extra.

## Flujo

1. En el panel de cobro, una sección plegable **"Datos del cliente (opcional)"**: DNI o RUC, número y nombre. Cerrada por defecto: la mayoría de las boletas van sin datos.
2. Al cobrar, la pantalla de éxito muestra el **número del comprobante** (B001-00000012) y los botones **Ver / imprimir** y **Listo**.
3. "Ver / imprimir" abre el comprobante con formato de ticket y la marca "SIMULADO"; "Imprimir" usa el diálogo del navegador.
4. En Caja, la sección **"Comprobantes del turno"** lista los emitidos (número, cliente, total) y permite abrir y reimprimir cualquiera.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueleto en la lista y en el ticket |
| Vacío | "Aún no hay comprobantes en este turno" |
| Error | RUC inválido o razón social faltante se muestran junto al campo, sin cobrar |
| Simulado | Franja visible "SIMULADO · sin validez tributaria" en pantalla e impresión |
| Impresión | Solo el ticket (el resto de la pantalla se oculta con `print:hidden`), ancho de 80 mm |
| Teclado | Foco al primer campo al abrir la sección; Enter confirma el cobro |

## Tareas

- [x] Datos del cliente en el cobro
- [x] Número de comprobante en la pantalla de éxito
- [x] Ticket imprimible
- [x] Lista "Comprobantes del turno"
- [x] `npm run lint` y `npx tsc --noEmit` sin errores

## Cierre del frontend (2026-10-12)

- Código: `app/panel/caja/receipt-ticket.tsx` (ticket de 80 mm e impresión del navegador), datos del cliente y número del comprobante en `charge-drawer.tsx`, lista "Comprobantes del turno" en `cash-view.tsx`; `receiptSchema` en `lib/schemas/caja.ts`.
- `npx tsc --noEmit` y `npm run lint` sin errores; `check_ui.py` sin avisos en `caja/`.
- Verificación manual pendiente: cobrar con y sin DNI/RUC, ver el ticket, imprimir (solo debe salir el ticket) y reabrirlo desde la lista del turno.
