# 033 — Panel operativo de caja

**Estado:** Cerrada (2026-10-20)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H2 (mejora de Caja)
**Documentos:** Doc. 02 §6.5, Doc. 08 §9–10, spec 009

## Qué y por qué

La caja ya permite abrir un turno, cobrar pedidos, registrar movimientos y cerrar con arqueo, pero no ofrece una lectura completa de cómo marcha el turno. El cajero y el administrador necesitan ver en una sola pantalla ventas, ticket promedio, efectivo esperado, última venta, distribución por método de pago, órdenes cobradas, gastos y flujo de efectivo.

La pantalla conserva las cuentas por cobrar y convierte el resto del turno en un tablero operativo vertical, usable en escritorio, tablet y celular.

## Criterios de aceptación

- [x] Con un turno abierto, el cajero ve ventas totales, ticket promedio, efectivo esperado, última venta y duración del turno.
- [x] Las gráficas de ventas por hora y métodos de pago se calculan con cobros reales del turno.
- [x] La lista de órdenes cobradas muestra pedido, tipo, mesa o cliente, cantidad de ítems, métodos de pago, total, cobrador y hora.
- [x] El cajero conserva las cuentas por cobrar y puede abrir el flujo de cobro existente.
- [x] Gasto, ingreso y retiro son acciones separadas, con concepto y categoría auditables.
- [x] El detalle de pagos, gastos y flujo de efectivo se actualiza tras cobrar o registrar un movimiento.
- [x] Se puede consultar el historial reciente de turnos permitidos al usuario.
- [x] La pantalla usa desplazamiento vertical y se adapta sin perder acciones en celular.
- [x] El aislamiento por inquilino, sucursal y permisos continúa aplicado por API y PostgreSQL RLS.

## Fuera de alcance

- Anulación de ventas o comprobantes.
- Exportación contable o reportes por rangos arbitrarios.
- Arqueo ciego y aprobación de diferencias por un supervisor.
