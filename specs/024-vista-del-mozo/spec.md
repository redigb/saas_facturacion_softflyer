# 024 — La vista del mozo: Pedidos, Mis órdenes y Carta

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (mejora pedida por el negocio)
**Documentos:** specs 004 y 006

## Qué y por qué

El rol **Mozo** ya existía: permisos `restaurante.pedidos.crear` + `clientes.ver`, pantalla POS responsive y entrada directa a Pedidos (su salón con plano, mesas y pedidos; el flujo es el mismo que el del admin, solo que sin los módulos que no le tocan). Lo que faltaba para que su panel sea un módulo completo:

1. **Carta en modo lectura**: el mozo no tenía entrada a la Carta (solo la veía dentro del pedido). Ahora la ve desde su menú, sin ningún control de edición (los permisos ya la vuelven solo lectura).
2. **Mis órdenes**: una pantalla nueva con SUS pedidos activos (los que abrió), para retomarlos o vigilarlos; se refresca con el tiempo real de siempre.
3. Y nada más: Pedidos (mesas + plano), Cocina, Caja, Equipo y Configuración siguen apareciendo solo para quien tiene permiso, y el layout responsive (celular y tablet) ya existía.

## Criterios de aceptación

- [x] Un mozo ve en el menú: **Pedidos, Mis órdenes y Carta**. No ve Cocina, Caja, Equipo, Configuración ni Inicio.
- [x] Al entrar, cae directo en Pedidos (su salón); en celular y tablet todo usa los layouts POS existentes.
- [x] «Mis órdenes» lista solo los pedidos activos abiertos por ese usuario (mesa o para llevar) con mesa/número, estado, tiempo, platos y total; tocar uno entra al pedido.
- [x] La lista de «Mis órdenes» se actualiza sola (PedidoActualizado) y tiene estados de carga, vacío y error con reintento.
- [x] La Carta del mozo es solo lectura: sin «Agregar plato», sin «Nueva», sin switches ni edición de precios.
- [x] El admin y el encargado también ven «Mis órdenes» (con sus propios pedidos) sin perder nada de lo suyo.

## Fuera de alcance

- Renombrar «Pedidos» a «Mesas»: es decisión de copy del equipo; el módulo ya es el salón de mesas.
- Propinas o comisiones por mozo.
- Zonas o asignación de mesas por mozo.
- Notificaciones push (se usa el tiempo real existente).

## Cierre (2026-10-13)

- Frontend: `navigation.ts` — «Mis órdenes» nueva (icono `lista`) y «Carta» visible también con `restaurante.pedidos.crear`; página `/panel/mis-pedidos` (server: `auth/yo`; cliente: `useActiveOrders` filtrado por mozo, tarjetas con estado/tiempo/platos/total, enlace al pedido, esqueleto, vacío y error con reintento). Backend sin cambios: rol, permisos y listados ya existían.
- E2E con navegador real (demo, cuenta de mozo **Rosa Quispe** creada por la API de equipo): al entrar cae directo en **Pedidos**; su menú muestra **solo Pedidos · Mis órdenes · Carta**; abrió la mesa M7 y la tarjeta «Mesa M7 #2 · ABIERTA · S/ 0.00» apareció en **Mis órdenes**; la **Carta** muestra «Vista de la carta en modo lectura» sin Agregar/Nueva/switches; capturas revisadas a 375 px (celular: menú hamburguesa, conmutador Plano|Mesas en «Mesas», tarjetas POS) y 1262 px (PC).
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): el pedido de prueba de Rosa (24) se borró; la demo quedó con su pedido de ejemplo (M1). La cuenta **rosa@softflyer.pe** se queda como mozo de prueba de la demo (a pedido: se puede desactivar o borrar).
