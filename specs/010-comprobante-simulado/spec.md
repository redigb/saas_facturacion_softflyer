# 010 — Comprobante simulado

**Estado:** ✅ Cerrada (2026-10-12; verificación manual en navegador a cargo del usuario)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H3 (Doc. 09 §2), **solo la parte visible**: la emisión real con Greenter y SUNAT queda para una spec posterior
**Documentos:** Doc. 04 §2 (tipos y series), Doc. 08 §11 (comprobantes y series)

## Qué y por qué

El piloto quiere ver su boleta o factura al cobrar. Antes de integrar Greenter (certificado, XML, firma, SUNAT) se **simula**: al cobrar se emite un comprobante con serie y correlativo reales, cliente opcional y un formato imprimible, marcado como "simulado". Así la pantalla, el flujo de cobro y los números quedan listos, y cuando llegue Greenter solo cambia *cómo* se emite, no *dónde* se ve.

## Criterios de aceptación

- [x] Cada venta cobrada genera su comprobante en la misma operación: boleta por defecto, factura si el cliente tiene RUC.
- [x] La numeración es correlativa por serie (B001-00000001…) y no se repite aunque dos cajeros cobren a la vez.
- [x] El cajero puede indicar DNI o RUC del cliente al cobrar; sin datos, la boleta sale a "CLIENTES VARIOS".
- [x] Un RUC inválido o una factura sin razón social se rechaza con un mensaje claro y no cobra nada.
- [x] Al terminar el cobro, el cajero ve el comprobante y puede imprimirlo.
- [x] En Caja hay una lista de los comprobantes del turno para reimprimirlos.
- [x] Todo comprobante dice "SIMULADO · sin validez tributaria" mientras no esté Greenter.
- [x] Una cuenta dividida emite un comprobante por cada cobro.

## Después: Greenter

La integración real vive en la [spec 011](../011-facturacion-greenter/spec.md), pendiente de diseño. Esta spec deja el enganche y documenta en `backend.md` (*Preparación para Greenter*) qué cumple ya y qué se agrega después.

## Fuera de alcance

- Greenter, XML, firma digital, envío a SUNAT, CDR, resúmenes diarios y comunicaciones de baja.
- Notas de crédito/débito y anulación de comprobantes.
- Impresión térmica por agente local (se usa el diálogo de impresión del navegador).
- Consulta automática de DNI/RUC (RENIEC/SUNAT).
- Obligar identificación en boletas de más de S/ 700.
