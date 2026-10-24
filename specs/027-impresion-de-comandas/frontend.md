# 027 — Frontend

Sigue el skill `softflyer-ui` (tokens, toque 44px+, sin diálogos nativos).

## Flujo

1. En la tarjeta de cada comanda (KDS) hay un botón **«Imprimir»** junto a «Todo listo».
2. Al tocarlo se arma el **papel de 80 mm** (oculto en pantalla) y se llama a `window.print()`; el navegador muestra **solo la comanda**.
3. Aceptado/cancelado el diálogo, se marca `impresa_en` en el servidor: la tarjeta muestra **«Impreso 12:30»** y el botón cambia a **«Reimprimir»**.
4. Nada más cambia: el KDS sigue su flujo normal aunque no haya impresora.

## Experiencia

| Tema | Decisión |
|---|---|
| Mecanismo | El mismo del comprobante de Caja (spec 010): `<style>` con `@media print` que oculta todo menos `#ticket-comanda` (visible solo al imprimir, `display:none` en pantalla) |
| Papel | 80 mm, `font-mono`: encabezado con estación y «Mesa X»/«Para llevar #N», `#pedido`, tanda y hora; platos con cantidad grande, nombre, modificadores y **notas bien visibles**; pie «enviada por». Sin precios |
| Botones | «Imprimir» (icono `lista`, variante secundaria) junto a «Todo listo» en el pie de la tarjeta |
| Marca | Tras el diálogo, `POST …/impresa` (mutación con reemplazo en caché); «Impreso HH:MM» en letra pequeña bajo los botones |
| Reimpresión | El mismo botón; la marca original no cambia (la decide el servidor) |
| Sin impresora | El diálogo del navegador no bloquea nada; el KDS funciona igual |

## Tareas

- [ ] `ticketSchema` + `impresa_en`; `usePrintTicket` (POST con reemplazo en caché)
- [ ] Botón «Imprimir»/«Reimprimir» + marca «Impreso HH:MM»
- [ ] Componente `PrintComanda` (80 mm, oculto en pantalla) + `window.print()` tras montar
- [ ] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores
