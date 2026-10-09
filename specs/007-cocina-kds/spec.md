# 007 — Cocina (KDS) y "plato listo"

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (Doc. 09 §2) — cierra el objetivo n.º 1 del cliente
**Documentos:** Doc. 05 §4.3 y §5 (estado de cocina, KDS), Doc. 08 §8 (canales), Doc. 09 §1 (comanda en cocina < 1 s)

## Qué y por qué

La spec 006 ya manda las comandas a cada estación. Falta quien las reciba: la pantalla de cocina (KDS). El cocinero ve las comandas de su estación en orden de llegada, marca cada plato "en preparación" y "listo", y el mozo recibe en su celular el aviso **"plato listo"** para recogerlo. Así se cierra el circuito mozo → cocina → mozo sin gritos ni papeles.

## Criterios de aceptación

- [x] El cocinero elige su estación (o "General") y ve solo sus comandas pendientes, la más antigua primero.
- [x] Una comanda nueva aparece sola en menos de 1 s, resaltada y con aviso sonoro opcional.
- [x] Cada comanda muestra mesa (o "para llevar"), número de pedido, mozo, minutos de espera (con alerta si se demora) y sus platos con cantidad, opciones y notas bien visibles.
- [x] Un toque en un plato avanza su estado (en cola → preparando → listo); "Todo listo" marca la comanda completa; se puede deshacer el último paso.
- [x] Un plato anulado por el mozo aparece tachado al instante para que nadie lo prepare.
- [x] Cuando un plato queda listo, su mozo recibe el aviso en su celular y lo ve en el pedido y en el salón.
- [x] El mozo marca el plato como entregado.
- [x] Varias pantallas de la misma estación se mantienen sincronizadas.
- [x] Funciona en una tablet o monitor táctil de cocina, con dedos húmedos o con guantes.

## Fuera de alcance

- Impresión física de comandas (agente local, Doc. 05 §6): Fase 2.
- Tiempos objetivo por plato y reportes de demora de cocina.
