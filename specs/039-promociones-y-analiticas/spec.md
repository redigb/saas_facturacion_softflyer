# 039 — Promociones de carta y Analíticas

**Estado:** Lista para probar (2026-10-31)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** Crecimiento del negocio (precios y reportes)
**Documentos:** Doc. 05 §4 · Doc. 08 §5, §6, §9 y §10 · specs 002, 009 y 033

## Qué y por qué

El administrador necesita dos herramientas que hoy no existen:

1. **Promociones** dentro de Carta: rebajar el precio de platos o categorías por un tiempo (happy hour, promo del día) sin tocar la carta a mano y volver atrás.
2. **Analíticas** en el panel: entender cómo van las ventas por año, mes y día, qué platos se venden más, qué métodos de pago usan los clientes y en qué horas entra el dinero.

## Criterios de aceptación

### Promociones
- [x] El administrador crea promociones con nombre, tipo (`PORCENTAJE` o `PRECIO_FIJO`) y valor.
- [x] La promo aplica a platos elegidos, a categorías elegidas o a ambos.
- [x] Tiene vigencia por rango de fechas, días de la semana y horario opcional.
- [x] La prioridad resuelve empates; una promo directa al plato gana a la de su categoría.
- [x] El mozo ve el precio promocional y el nombre de la promo en la carta; el carrito suma ese precio.
- [x] El pedido congela el precio promocional y el descuento; la boleta cobra ese precio.
- [x] Al desactivar, vencer o borrar la promo, los pedidos ya enviados no cambian.
- [x] La pestaña muestra el estado: Vigente, Programada, Vencida, Inactiva o Fuera de horario.
- [x] Sin permisos `productos.*` la pestaña se ve en modo lectura.

### Analíticas
- [x] Solo accede quien tiene `reportes.ventas` (hoy el Administrador).
- [x] Filtros por rango de fechas, atajos (hoy, 7 días, mes, año, año pasado) y sucursal.
- [x] KPIs: ventas, cuentas cobradas, ticket promedio, platos vendidos e IGV.
- [x] Comparación porcentual contra el periodo anterior de igual duración.
- [x] Serie de ventas por día, mes o año según el rango, y total por año.
- [x] Top 10 de platos y de categorías, métodos de pago, horas punta y días de la semana.
- [x] Ventas por cobrador y por sucursal.
- [x] Solo suma ventas `EMITIDA` y respeta RLS, permisos y sucursales del usuario.
- [x] Estados de carga, vacío y error con Reintentar.

## Fuera de alcance

- Combos de varios platos con precio único.
- Promociones por sucursal (esta versión aplica al inquilino completo).
- Cupones, códigos o promociones que el cajero aplique manualmente.
- Exportación a Excel/CSV y reportes programados por correo.
- Costeo y márgenes (requieren la receta cuantificada de Inventario).

## Verificación

- `php artisan test --filter="PromotionTest|AnalyticsTest|ChargeTest|OrderTest|MenuTest"`: 63 pruebas en verde.
- `npx tsc --noEmit` y `npm run lint`: sin errores nuevos.
- Recorrido manual pendiente en navegador: crear happy hour, ver el precio en Pedidos y cobrarlo; abrir Analíticas y cambiar filtros.
