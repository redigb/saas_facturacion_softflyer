# 040 — Frontend

## Acceso

- **Globo flotante** en la esquina inferior derecha de **todas** las pantallas del panel, visible con `reportes.ventas`. Se monta una sola vez en `PanelShell`, así que conserva la conversación mientras navegas.
- Sin ítem en el menú lateral: el acceso principal es el globo.
- En escritorio abre un panel de 420 px anclado sobre el globo; en móvil, una hoja a pantalla completa con fondo oscuro. `Escape` cierra.
- `/panel/asistente` sigue existiendo como vista completa (enlace directo) y oculta el globo para no duplicarlo.

## Conversación

- Estado vacío con sugerencias táctiles («¿Cuánto vendí ayer?», «¿Cuáles son mis horas punta?»,
  «¿Cómo van mis meseros?», «¿Cómo está mi inventario?», «¿Qué me recomiendas?»,
  «Productos más vendidos de este mes») y un texto que explica que solo se consultan datos del restaurante.
- Composer con `Enter` para enviar, `Shift+Enter` para salto, máximo 500 caracteres con contador.
- Burbujas de usuario y asistente; respuesta en texto plano (`whitespace-pre-line`), nunca HTML.
- Estados: «Consultando tus datos…» mientras responde, error con **Reintentar** y
  **Nueva conversación** para limpiar el chat.
- La conversación vive en el estado de React: no se persiste ni se comparte entre sesiones.

## Respuesta y visualizaciones

- Chip con el período consultado (`26 oct – 1 nov 2026`).
- `metric`: tarjeta con el monto.
- `barras`: gráfico de barras reutilizando el componente de Analíticas.
- `comparacion`: ambos períodos y la variación porcentual.
- `lista`: ranking o productos con stock bajo, con detalle por fila.
- Solo se dibuja una visualización si el backend envía un tipo válido (Zod).

## Aviso

«El asistente solo consulta información. No modifica precios, ventas, pedidos ni inventario.
Los montos son de ventas registradas y no reemplazan un cierre contable.»

## Tareas

- [x] Esquema Zod del contrato y consulta `useAskAssistant`.
- [x] Chat, sugerencias, carga, error, reintento y reinicio.
- [x] Globo flotante global + panel compacto responsive.
- [x] Render de las cuatro visualizaciones.
- [x] Icono propio.
- [x] `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
