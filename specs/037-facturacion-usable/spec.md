# 037 — Facturación usable

**Estado:** Lista para probar (2026-10-29)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H3 (facturación)
**Documentos:** Doc. 04 §5 · spec 010 · spec 017b

## Qué y por qué

El cajero ya emite boletas y facturas reales (spec 017b), pero todavía no se puede usar con un cliente:

1. **El ticket no es una representación impresa válida.** Le faltan el código QR, el resumen (hash) de la firma, el importe en letras y la leyenda "Representación impresa de la …".
2. **El menú "Facturación" está vacío.** Los comprobantes solo se ven por turno dentro de Caja. El dueño no puede buscar, reimprimir ni ver si SUNAT aceptó cada uno.
3. **No se pueden descargar el XML ni el CDR**, que el contador pide.

## Criterios de aceptación

- [x] El ticket de un comprobante real muestra: leyenda de representación impresa, importe en letras, resumen (hash) y QR con el formato de SUNAT (`RUC|tipo|serie|número|IGV|total|fecha|tipo doc cliente|número doc cliente|hash|`).
- [x] El hash se obtiene al emitir: el ticket se imprime en el momento aunque SUNAT esté caída.
- [x] El ticket simulado sigue diciendo "Simulado · sin validez tributaria" y no muestra QR.
- [x] "Facturación" lista los comprobantes de los locales del usuario, del más reciente al más antiguo, con filtros por fecha, tipo, estado y búsqueda (número, documento o nombre del cliente), paginados.
- [x] Cada comprobante muestra su estado ante SUNAT en lenguaje simple, con el mensaje de SUNAT si fue observado o rechazado.
- [x] Desde el detalle se reimprime el ticket y se descargan el XML y el CDR (si existen).
- [x] Solo quien tiene `comprobantes.emitir` ve "Facturación" y descarga; nadie ve comprobantes de un local donde no trabaja.

## Fuera de alcance

- Notas de crédito y comunicación de baja (próxima spec).
- Venta directa sin pedido.
- PDF A4 y envío del comprobante por correo al cliente.
- Consulta de CDR y respuesta 1033 en producción (spec 017b).
