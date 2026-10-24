# 020 — Carta y pedidos: estación a la vista, tarjeta con descripción y pedido en cero

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (ajustes pedidos por el negocio)
**Documentos:** specs 002, 006 y 019

## Qué y por qué

Tres ajustes pedidos por el negocio:

1. **La estación del plato, a la vista.** El formulario ya permitía elegir a qué estación va cada plato (Cocina, Bar, Parrilla…), pero vivía escondido dentro de «Más opciones»: al crear un plato no se veía. Se movió al formulario principal (misma regla: por defecto, la de su categoría).
2. **La tarjeta del plato en Pedidos, con contexto.** Mostraba solo nombre y precio. Ahora muestra también su categoría y su descripción en letra chica (11px), como se lee en una carta física.
3. **Un pedido en cero no existe.** Al salir al salón, cualquier pedido sin platos activos y con el carrito vacío se anula solo: una mesa abierta por error, un para llevar vacío o un pedido con todos sus platos anulados (S/ 0.00). Con platos activos o con líneas en el carrito no se toca. (Regla confirmada con el negocio; extiende la spec 019 al caso de mesas y al de todo anulado.)

## Criterios de aceptación

- [x] «¿A qué estación va?» aparece en el formulario principal del plato, sin abrir «Más opciones», con el mismo comportamiento de siempre (por defecto la de su categoría).
- [x] La lista de la Carta sigue mostrando la estación efectiva de cada plato.
- [x] La tarjeta del plato en el menú de Pedidos muestra: categoría (chiquita), nombre, descripción (~11px, si tiene) y precio.
- [x] `GET /carta` entrega `descripcion` por producto (contrato de la spec 002 actualizado, también anotado en su documento).
- [x] Al salir al salón, un pedido sin platos activos y con el carrito vacío se anula solo — mesa abierta por error, para llevar vacío o con todos sus platos anulados. Queda registrado como `ANULADO`: nada se borra.
- [x] Con platos activos, con platos enviados sin anular, con un envío en curso o con líneas en el carrito, el pedido NO se toca.
- [x] Los avisos y permisos siguen igual que siempre.

## Fuera de alcance

- Editar la estación desde Pedidos (se hace en Carta).
- Estaciones por sucursal.
- Fotos de plato en la tarjeta.
- Borrar físicamente pedidos del histórico (siempre se anulan).

## Cierre (2026-10-13)

- Backend: `GetMenu` entrega `descripcion` por producto; el contrato de la spec 002 quedó actualizado y anotado. Suite completa en verde: **135 pruebas (1044 aserciones)**.
- Frontend: `product-drawer` con «¿A qué estación va?» en el formulario principal y «Más opciones» solo para tipo/descripción/modificadores; `menu-picker` con categoría (10px), nombre, descripción (11px, `line-clamp-2`) y precio; `order-view` descarta al salir cualquier pedido sin platos activos ni carrito; `schemas/pedidos` con el campo nuevo.
- E2E con navegador real (demo y Don José): el selector de estación aparece sin abrir «Más opciones» y lista *La de su categoría / Bar / Cocina*; la tarjeta de «Amburguesas» muestra **HAMBURGUESAS** + *Hamburguesa de carne simple* + **S/ 25.00**; la mesa M2 abierta y abandonada sin nada se anuló sola (pedido 13 → `ANULADO`); con «Causa limeña» en el carrito, la mesa M3 quedó `ABIERTO` (pedido 14); al quitar el plato del carrito y salir, el 14 quedó `ANULADO`. Verificado también en PostgreSQL.
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas (las 93 existentes son previas, del lienzo SVG).
- Limpieza (reportada): los pedidos de prueba propios (13 y 14) se borraron; los pedidos 1, 2, 4 y 12 no se tocaron.
