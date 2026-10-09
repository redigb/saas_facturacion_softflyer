# 006 — Pedidos del mozo

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (Doc. 09 §2) — objetivo n.º 1 del cliente
**Documentos:** Doc. 05 §4 y §11, Doc. 08 §8 (pedidos y comandas), Doc. 07 §5 (idempotencia), Doc. 09 §1 y §3 (reactividad)

## Qué y por qué

El cliente pidió que las órdenes sean rápidas, sin latencia y totalmente reactivas. Esta spec es la pantalla del mozo: ve el salón, toca una mesa, carga platos con sus opciones y los envía a cocina. Cada envío genera una **comanda por estación** (cocina, bar…), lista para que el KDS de la spec 007 la muestre al instante.

## Criterios de aceptación

- [x] El mozo ve todas las mesas de su sucursal con su estado (libre, ocupada, por cobrar) y se actualizan solas cuando otro mozo abre o cierra una.
- [x] Toca una mesa libre y abre el pedido en un toque; una mesa nunca queda en dos pedidos abiertos a la vez, aunque dos mozos la toquen en el mismo segundo.
- [x] También puede abrir un pedido **para llevar** (sin mesa).
- [x] Agrega platos de la carta (con modificadores obligatorios y opcionales, cantidad y nota) sin esperar al servidor.
- [x] "Enviar a cocina" manda la tanda en una sola operación: cada estación recibe su comanda y nunca se duplica por un reintento de red.
- [x] Ve qué platos ya se enviaron y en qué estado de cocina están.
- [x] Anula un plato ya enviado solo con permiso y motivo (queda registrado, no se borra).
- [x] Pide la cuenta (la mesa pasa a "por cobrar") y puede reabrir si el cliente pide algo más.
- [x] Anula un pedido abierto por error mientras no tenga platos enviados.
- [x] Funciona cómodo en el celular, con una mano.

## Fuera de alcance

- Pantalla de cocina (KDS) y "plato listo" para el mozo: spec 007.
- Cobro, cliente (`clientes`), cierre del pedido y liberación de la mesa al cobrar: H2.
- Unir y mover mesas (`restaurante.mesas.gestionar`), dividir cuenta: specs posteriores.
- Impresión física de comandas (agente local, Doc. 05 §6): Fase 2.
