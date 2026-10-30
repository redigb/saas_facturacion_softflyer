# 037 — Frontend

## Para quién y dónde

- **El dueño o el administrador**, en la computadora de la oficina o en el celular, revisando lo que se facturó.
- **El cajero**, que necesita reimprimir un ticket o confirmar si SUNAT aceptó una factura.

## Flujo

1. Menú "Facturación" → `/panel/facturacion`.
2. Arriba están los filtros: rango de fechas (hoy por defecto), tipo, estado y búsqueda.
3. La tabla muestra fecha, número, cliente, total y estado. En el celular se ve como lista de tarjetas.
4. Al hacer clic en una fila se abre el detalle, que tiene el ticket, "Imprimir", "Descargar XML" y "Descargar CDR".

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Skeleton gris de filas; los filtros siguen usables |
| Vacío | "No hay comprobantes en estas fechas", con un botón para limpiar los filtros |
| Error | Mensaje con "Reintentar"; un 403 muestra "No tienes acceso a facturación" |
| Estados | Aceptado (verde) · En proceso (ámbar) · Observado (ámbar, con el mensaje) · Rechazado o Vencido (rojo, con el mensaje) · Simulado (gris) |
| Ticket | Leyenda, importe en letras, hash y QR (SVG, 30 mm) en los comprobantes reales |
| Descargas | Solo se habilitan si existe el archivo; si no, se explica "SUNAT aún no responde" |
| Teclado y accesibilidad | La fila se abre con Enter; el estado lleva texto y no solo color |

## Tareas

- [x] Esquema zod con los campos nuevos
- [x] Ticket con leyenda, letras, hash y QR (`qrcode.react`)
- [x] `/panel/facturacion`: filtros, tabla o tarjetas, paginación y detalle
- [x] Descargas de XML y CDR
- [x] Entrada "Facturación" del menú con `href`
