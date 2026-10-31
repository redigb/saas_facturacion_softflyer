# 039 — Frontend

## Promociones en Carta

**Dónde.** Cuarta pestaña de `/panel/carta`: **Promociones** (icono de rayo).

**Lista.** Tarjetas por promoción con nombre, estado (`Vigente`, `Programada`, `Vencida`,
`Inactiva`, `Fuera de horario`), valor destacado (`-20%` o `S/ 8.90`), alcance, vigencia y
días/horario. Acciones Editar y Eliminar según `productos.editar` / `productos.eliminar`.

**Formulario (drawer).**
- Nombre y descripción.
- Tipo: porcentaje o precio fijo; valor.
- Desde / hasta con `datetime-local` en hora de Perú.
- Chips L M X J V S D (todos = cualquier día).
- Interruptor "Limitar por horario" con hora inicio/fin.
- Prioridad y activo.
- Selector de categorías y buscador de platos con checkbox y precio de lista.
- Debe elegir al menos un plato o categoría; `%` no puede pasar de 100.

**Precio promocional en Pedidos.** La carta muestra el precio promocional, el de lista tachado
y un chip con el nombre de la promo. El carrito y el total usan `precio_promocional ?? precio_venta`;
"Enviados" muestra el nombre de la promo y el ahorro de la línea.

## Analíticas

**Dónde.** Menú **Gestión → Analíticas** (`/panel/analiticas`), visible con `reportes.ventas`.
Sin el permiso la página muestra "Acceso restringido".

**Filtros.** Chips Hoy / 7 días / Este mes / Este año / Año pasado, fechas personalizadas,
selector de sucursal y selector de año. Al cambiar un filtro se conserva el reporte anterior
atenuado mientras llega el nuevo.

**Contenido.**
- Cuatro KPI con delta vs periodo anterior: ventas, ticket promedio, platos vendidos y cuentas
  cobradas (con IGV como hint).
- Evolución de ventas (día/mes/año según el rango) y total por año.
- Top platos y categorías con barra de participación.
- Dona de métodos de pago, barras por hora y por día de la semana.
- Tablas de ventas por cobrador y por sucursal.
- Estados: skeleton, vacío ("Aún no hay ventas en este rango") y error con Reintentar.

**Diseño.** Barras y dona en SVG/CSS con los mismos tokens de Caja (sin dependencias nuevas),
montos `tabular-nums`, responsive de una a tres columnas.

## Tareas

- [x] Esquemas Zod de promociones y analíticas.
- [x] Pestaña y drawer de promociones.
- [x] Precio promocional en carta, carrito y detalle enviado.
- [x] Pantalla de analíticas con filtros, gráficas y tablas.
- [x] Navegación, icono y guardia de permiso.
- [x] `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
