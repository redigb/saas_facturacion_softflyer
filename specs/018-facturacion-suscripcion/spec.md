# 018 — Facturación de la suscripción

**Estado:** Diseño (decisiones tomadas; sin código)
**Backend:** ⚪ · **Frontend:** ⚪
**Depende de:** 017b (motor Greenter) y del backoffice (cobros)

## Qué y por qué

Softflyer también factura: cada cliente paga una suscripción y Softflyer le emite su comprobante con su propio RUC, usando el mismo motor de facturación que ya usan los clientes. Sin duplicar nada de SUNAT.

## Decisiones

- **Softflyer es un inquilino interno** (`es_interno`): con su RUC, certificado, clave SOL, series y homologación. Reutiliza numeración, firma, envío, reintentos, consulta de CDR y alertas.
- **El interno no es un cliente:** no aparece en la lista de clientes ni cuenta en las métricas del resumen. Sus comprobantes **sí** entran a las alertas.
- **Aptitud para facturar:** la decide el administrador, igual que con cualquier empresa: marca de homologación y "Probar credenciales" en su ficha. Hasta entonces sus comprobantes son simulados y no salen a SUNAT.
- **IGV:** el mismo interruptor por sucursal que ya existe (tasa de la sucursal y exoneración por zona, con su leyenda). Softflyer lo activa o desactiva según su zona.
- **Cuándo se emite:** **después de recibir el pago**, nunca antes. Registrar un pago en Cobros emite el comprobante en el mismo paso.
- **Tipo de comprobante:** el cliente tiene RUC → **factura**. Sin RUC → **boleta con DNI** (desde S/ 700 el DNI es obligatorio, como en el resto del sistema).
- **Detalle:** una línea por periodo, p. ej. "Suscripción Plan Restaurante — 1 mes (23/10/2026 al 23/11/2026)".

## Lo que hay que construir

1. **Desacoplar el motor de la venta de restaurante (018a).** Hoy `IssueReceipt` exige venta, caja abierta, cajero y sucursal. Se separa para emitir **a partir de líneas** (documento del cliente, líneas, totales); el flujo de ventas queda igual y sus pruebas deben seguir pasando. No se simula una caja para Softflyer.
2. **Inquilino interno y su ficha fiscal (018a).** Marca `es_interno`; se configura desde el mismo backoffice (certificado, SOL, tasa, homologación).
3. **Pagos y emisión (018b).** Registrar un pago (monto, medio, fecha, referencia) activa o renueva el plan y emite el comprobante. Historial de pagos y comprobantes por cliente; PDF y XML descargables.
4. **Notas de crédito y comunicación de baja (018c).** Una factura emitida no se borra: se corrige con nota de crédito o se da de baja. Hoy el motor no las tiene, y los clientes también las necesitarán.
5. **PDF y correo al cliente (018c).** Representación impresa y envío del comprobante por correo.
6. **Renovaciones automáticas (018c).** El cargo del siguiente periodo se prepara solo y se avisa al administrador antes del vencimiento.

## Criterios de aceptación

- [ ] Emitir desde líneas no rompe el flujo de ventas (suite actual verde).
- [ ] El inquilino interno no aparece en Clientes ni en las métricas, y sus comprobantes aparecen en las alertas.
- [ ] Registrar un pago emite factura (con RUC) o boleta (con DNI) a SUNAT en beta y queda aceptada.
- [ ] El IGV del comprobante sigue la tasa y la exoneración de la sucursal de Softflyer.
- [ ] Sin la configuración fiscal completa, el pago se registra y el comprobante queda simulado, sin salir a SUNAT.
- [ ] Una nota de crédito corrige una factura aceptada.

## Decisiones adicionales

- **Medio de cobro:** queda pendiente. Por ahora el administrador **valida el pago a mano** (el cliente pagó por el medio que sea y se registra); una pasarela se configurará a futuro sin cambiar el flujo: solo cambia quién registra el pago.
- **Un solo local** para Softflyer.

## Abierto

- Series propias de Softflyer.
