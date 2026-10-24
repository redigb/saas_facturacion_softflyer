# 025 — Mesas con dueño: cada mozo atiende lo suyo

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (regla de negocio pedida por el negocio)
**Documentos:** specs 004, 006 y 024

## Qué y por qué

Hasta ahora cualquier usuario con `restaurante.pedidos.crear` podía entrar y operar **cualquier** mesa/pedido activo, aunque lo haya abierto otra persona (diseño original de la spec 006: los mozos se ayudan y suman al mismo pedido). El negocio decidió cambiarlo:

> **Un mozo atiende solo SUS pedidos. Los jefes (encargado y administrador) pueden con todos.**

Reglas:
- **Debe quedar claro quién lo abrió**: al tocar una mesa ocupada ajena, el mozo ve el aviso *"La abrió José Ramírez"* y no entra.
- **El servidor manda**: aunque alguien llegue por URL directa, `enviar a cocina`, `pedir cuenta`, `reabrir` y `anular pedido` responden **403 `PEDIDO_AJENO`** si no eres el dueño ni jefatura.
- **Abriste tú, atiendes tú**: tus mesas funcionan igual que siempre (y "Mis órdenes", spec 024, es tu lista).
- **Jefatura** = `panel.ver` (administrador) o `restaurante.mesas.gestionar` (encargado de salón).
- **Fuera de esta regla**: cocina (estados/entregado) y cobro en Caja siguen con sus permisos; abrir una segunda cuenta en una mesa ocupada sigue bloqueado (409, ya existía).

## Criterios de aceptación

- [x] Un mozo que toca una mesa con pedido **abierto por otro** ve el aviso con el nombre ("La abrió José Ramírez") y **no entra**.
- [x] El servidor rechaza `enviar a cocina`, `pedir cuenta`, `reabrir` y `anular` de un pedido ajeno con **403 `PEDIDO_AJENO`** (incluye el nombre del dueño en `detalles.mozo`).
- [x] El mozo **dueño** opera su pedido exactamente como hoy.
- [x] El **encargado** y el **administrador** operan cualquier pedido.
- [x] Si por una carrera alguien cae en el pedido del otro, lo ve con el aviso de "pedido ajeno" y **sin controles** (solo lectura).
- [x] "Mis órdenes" (spec 024) sigue mostrando solo las propias.
- [x] Pruebas del backend y E2E con sesiones reales.

## Fuera de alcance

- Reasignar un pedido a otro mozo (cambiar de dueño): otra spec.
- Unir/transferir mesas.
- Restringir cocina o cobro (siguen por permisos).

## Cierre (2026-10-13)

- Backend: guard central `ManageOrders::ensureCanOperate` (dueño del pedido, o jefatura `panel.ver` / `restaurante.mesas.gestionar`) aplicado a **enviar, cuenta, reabrir y anular**; error 403 `PEDIDO_AJENO` con `detalles.mozo`. El contrato de la 006 quedó anotado con el cambio. Suite: **143 pruebas (1092 aserciones)** en verde, incluida `OrderAccessTest` (mozo ajeno 403 en las cuatro operaciones; encargado y admin habilitados; dueño sin regresión).
- Frontend: `pedidos/page.tsx` pasa el usuario actual (id + jefatura) al salón; tocar una mesa/pedido ajeno muestra el aviso «La abrió X» y no navega (tarjetas y plano); `[id]/page.tsx` pasa `user` y el pedido ajeno queda en **solo lectura** con banner (sin carrito editable, sin Enviar/Pedir cuenta/Reabrir/Anular); el descarte del pedido en cero no aplica a pedidos ajenos.
- E2E con navegador real (demo): Rosa (mozo) tocó la M1 del admin → toast «La abrió Usuario Demo. Solo esa persona, el encargado o el admin pueden atenderla.» y no navegó (captura revisada); `/panel/pedidos/1` por URL → banner ajeno y **cero botones de operación**; su propia M6 funcionó normal (sin banner, «Anular pedido» visible, carrito editable). Contra la API con el token de Rosa: enviar/anular/pedir cuenta del pedido del admin → **403 `PEDIDO_AJENO`** con el nombre del dueño.
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): el pedido de prueba de Rosa (25) se anuló solo al salir y se borró; la demo quedó con su pedido de ejemplo (M1).
