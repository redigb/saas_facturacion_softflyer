# 027 — Imprimir comanda desde el KDS (navegador)

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (pedido por el negocio)
**Documentos:** specs 007 y 010 · Doc. 05 §6 (impresión física)

## Qué y por qué

Hoy la cocina/barra trabaja solo con la pantalla (KDS). Muchos restaurantes quieren además **el papel de la comanda**: para el cocinero que no mira la tablet, para pinchar el ticket en el pase, o para dejar constancia. La solución que **funciona hoy y en cualquier local** es imprimir desde el mismo KDS con el **diálogo del navegador** (el mismo patrón del comprobante de Caja, spec 010): sirve con **cualquier impresora instalada en esa PC/tablet** (térmica con driver, de red con driver, o normal).

Además se **despierta la columna `comandas.impresa_en`** (hasta hoy dormida): la primera impresión queda marcada, la tarjeta muestra «Impreso 12:30» y el botón pasa a «Reimprimir». Esto prepara el terreno para el **agente local** (spec 028), que usará la misma marca.

Reglas:
- Botón **«Imprimir» por comanda** en el KDS (no por plato: la comanda es lo que va al papel).
- El papel sale en formato **80 mm**: estación, mesa/pedido, número de tanda, hora, platos con cantidad/modificadores/notas y quién la envió. **Sin precios** (igual que la pantalla).
- Al aceptar el diálogo se marca `impresa_en` (**la primera marca no se mueve**, ni con reimpresiones).
- La impresión **no** bloquea nada: si no hay impresora, el KDS sigue igual.

## Criterios de aceptación

- [x] Cada comanda del KDS tiene «Imprimir»; el diálogo del navegador muestra **solo** la comanda en 80 mm.
- [x] El papel incluye: estación, «Mesa X» o «Para llevar #N», #pedido, tanda, hora, platos (cantidad, nombre, modificadores, notas) y «enviada por».
- [x] Tras imprimir, la tarjeta muestra «Impreso HH:MM» y el botón dice «Reimprimir».
- [x] Reimprimir **no** cambia la marca original (`impresa_en` se conserva).
- [x] Solo **cocina** o **admin** pueden marcar impresa (403 para el resto).
- [x] Pruebas backend + E2E (diálogo interceptado, papel y marca verificados).

## Fuera de alcance

- Auto-impresión ESC/POS (agente local): **spec 028** (pendiente de diseño).
- Impresión Bluetooth/en apps de terceros (RawBT, etc.).
- Reimprimir comprobantes de Caja (ya existe, spec 010).

## Cierre (2026-10-13)

- Backend: `POST /cocina/comandas/{ticket}/impresa` (permiso `restaurante.cocina.actualizar_estado` o `panel.ver`) con `KitchenBoard::markPrinted` (guard de sucursal; **la primera marca gana**); `impresa_en` agregado a todas las respuestas del KDS. Pruebas nuevas en `KitchenTest` (imprime y marca; reimprimir conserva; mozo 403; admin OK). **Suite completa en verde.** El contrato de la 007 quedó extendido con el nuevo campo.
- Frontend: botón «Imprimir»/«Reimprimir» por comanda (con «Impreso HH:MM» debajo); `PrintComanda` de 80 mm oculto en pantalla y visible solo al imprimir (mismo patrón del comprobante de Caja). `tsc`, `lint` y `check_ui.py` sin novedades.
- E2E con navegador real (demo, admin): pedido de prueba en M8 (Ceviche con nota → Cocina; Chicha → Barra); al tocar «Imprimir» el papel capturado fue `Comanda · Cocina / Mesa M8 / #2 · 06:03 p. m. / 1× Ceviche clásico / ⚠ sin ají, bien picante / Enviada por Usuario Demo`, el botón pasó a «Reimprimir» y `impresa_en` quedó grabado en la comanda 9 (la de barra siguió sin imprimir). Capturas revisadas.
- Limpieza (reportada): pedido de prueba 28 y sus comandas/detalles borrados; M8 libre; **reparadas M4 y M7** que habían quedado «OCUPADA» sin pedido activo (residuo de pruebas viejas borradas por SQL); demo final: solo el pedido de ejemplo en M1.
