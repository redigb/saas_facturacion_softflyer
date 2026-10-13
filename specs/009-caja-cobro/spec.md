# 009 — Caja y cobro

**Estado:** ✅ Cerrada (2026-10-12; la verificación manual en navegador queda a cargo del usuario)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H2 (Doc. 09 §2) — desbloquea los objetivos 2 y 3 del cliente
**Documentos:** Doc. 08 §9 (venta y cobro) y §10 (caja), Doc. 05 §2 y §7, Doc. 06 §4 y §6 (permisos `caja.*` y rol + sucursal), Doc. 07 §5 (idempotencia en `POST /pagos`)

## Qué y por qué

Hoy el pedido llega a `POR_COBRAR` y ahí se queda: no hay caja ni forma de cobrar. El cajero abre su turno con un monto inicial, cobra los pedidos que piden la cuenta (en efectivo, tarjeta, Yape/Plin, o mezclando métodos), puede dividir la cuenta, y al final cierra con un arqueo que dice cuánto efectivo debería haber. Cobrar cierra el pedido y libera la mesa. La factura electrónica (spec posterior, H3) se engancha a la venta que se crea aquí, sin bloquear el cobro.

## Criterios de aceptación

- [ ] El cajero abre su caja con un monto inicial y ve su turno activo en el panel; una caja no tiene dos turnos abiertos.
- [ ] Sin turno abierto no se puede cobrar: el cajero ve "Abre tu caja para cobrar".
- [ ] Los pedidos en `POR_COBRAR` aparecen en la pantalla Caja al instante, sin recargar.
- [ ] Cobrar un pedido completo con uno o varios métodos de pago lo cierra y libera la mesa; el vuelto de efectivo se calcula solo.
- [ ] Un doble toque o un reintento por red caída no cobra dos veces (idempotencia).
- [ ] Se puede dividir la cuenta: cada comensal paga sus platos; el pedido se cierra al cubrirse todos.
- [ ] El mozo **no** cobra ni ve la caja (Doc. 08 §4).
- [ ] El cajero registra ingresos y egresos manuales con concepto.
- [ ] Al cerrar, ve el efectivo esperado, declara lo contado y queda registrada la diferencia.
- [ ] Un cajero de una sucursal no opera la caja de otra.

## Fuera de alcance

- Emisión de boleta/factura y envío a SUNAT (H3): la venta nace sin comprobante.
- Clientes y datos de boleta/factura (H3).
- Propinas y descuentos por línea: se guardan en 0 hasta que se pidan.
- Impresión de ticket.
- Reportes de ventas por turno.
