# 034 — Órdenes del administrador

**Estado:** Cerrada (2026-10-20)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H2 (mejora operativa)
**Documentos:** Doc. 06 §5 · Doc. 07 §3.3 y §5

## Qué y por qué

El administrador necesita una vista global de las órdenes del local para supervisar su estado y cobrarlas sin entrar primero a Caja. La misma ruta conserva la vista personal «Mis órdenes» para el mozo, evitando que vea pedidos ajenos.

## Criterios de aceptación

- [x] El administrador ve «Órdenes» en el menú y un tablero del día con totales, filtros y todas las órdenes de sus sucursales autorizadas.
- [x] Cada tarjeta muestra tipo, estado, mesa o cliente, responsable, hora, platos y total.
- [x] Al tocar una orden se abre un detalle lateral; una orden por cobrar puede cobrarse con el flujo real de Caja.
- [x] Si el administrador no tiene una caja abierta, la pantalla explica cómo habilitar el cobro y enlaza a Caja.
- [x] El mozo conserva «Mis órdenes» y solo ve sus pedidos activos.
- [x] La experiencia usa la paleta Softflyer y funciona en celular, tableta y escritorio.
- [x] El cobro iniciado desde Órdenes aparece en un modal centrado con el total destacado y opciones táctiles de pago, incluido pago mixto.

## Fuera de alcance

- Reportes históricos por rango de fechas; esta entrega resume el día operativo actual.
- Alterar desde esta pantalla los estados internos de preparación de Cocina o Barra.
