# 038 — Frontend

## 1. Para llevar con mesa y boleta conjunta

**Salón (`/panel/pedidos`).** "Para llevar" ya no abre el pedido directo: muestra un diálogo
con las mesas ocupadas (código y número de pedido) y la opción **Sin mesa (mostrador)**.
La tarjeta del para llevar activo indica `Mesa M3` o `Mostrador`.

**Caja (`/panel/caja`).** La cuenta por cobrar de la mesa se abre con todos sus platos y,
debajo, los de cada para llevar con su etiqueta (`Para llevar #14`). Todos se seleccionan y
se cobran juntos; el resultado dice `Mesa M3` y el resumen muestra una sola fila.

## 2. KDS

`kitchen-board.tsx`: `DEMORA_MIN = 15`. Al llegar a 15 minutos la píldora y el borde de la
tarjeta pasan a rojo; el reloj se actualiza cada 5 s para que el cambio sea puntual.
El resaltado azul de comanda nueva (8 s) conserva prioridad visual.

## 3. Gastos digitales

En el drawer **Gasto** aparece **Método de pago**: Efectivo, Yape, Plin, tarjetas y
transferencia. La nota recuerda que los digitales no descuentan el efectivo del arqueo.
Ingreso y retiro siguen siendo efectivo. El bloque de flujo muestra
"Gastos digitales (no afectan el arqueo)".

## 4. Preparación

Cada fila de ingrediente es `nombre · cantidad · unidad · quitar`. La unidad se elige entre
ONZ, ml, gr y kg (nueva fila: gr). "Agregar" y la papelera son `type="button"`: ya no envían
el formulario ni cierran el panel.

## Experiencia

| Tema | Decisión |
|---|---|
| Para llevar | Un toque extra (elegir mesa) solo al crear; cero toques extra al cobrar |
| Boleta conjunta | Los platos de la mesa y del para llevar se ven agrupados y se seleccionan igual |
| Error de grupo | Si el para llevar no pertenece a la mesa, la API responde 422 y no se cobra nada |
| Gastos | El método digital se ve en el selector y en el resumen |
| Preparación | Se pueden agregar varios ingredientes seguidos sin perder lo escrito |

## Tareas

- [x] Diálogo de mesa para "para llevar" y etiqueta en las tarjetas.
- [x] Drawer de cobro con acompañantes y `pedidos_adicionales`.
- [x] Resultado y resumen de caja con el nombre de la mesa.
- [x] Umbral de demora 15 min y refresco cada 5 s.
- [x] Selector de método de pago en gastos y flujo de efectivo separado.
- [x] Selector de unidades y corrección del submit accidental en Preparación.
- [x] `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
