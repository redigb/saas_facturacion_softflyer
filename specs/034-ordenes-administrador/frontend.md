# 034 — Frontend

## Para quién y dónde

El administrador supervisa y cobra desde laptop, tableta o celular. El mozo continúa usando la ruta como acceso rápido a sus propias órdenes durante el servicio.

## Flujo

1. El administrador entra a «Órdenes» y ve los indicadores del día.
2. Filtra por estado, tipo o persona asignada.
3. Toca una tarjeta para revisar sus platos y estado de preparación.
4. Si está por cobrar y tiene una caja abierta, inicia el cobro real desde el detalle.
5. Al finalizar, los indicadores y la tarjeta se actualizan.
6. El cobro iniciado aquí se presenta en un modal centrado; Caja conserva su drawer operativo.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueleto de indicadores y tarjetas |
| Vacío | Mensaje según los filtros y acción para limpiarlos |
| Error | Mensaje de la API y botón Reintentar |
| Respuesta a cada acción | Drawer con estados de carga y avisos existentes |
| Celular | Indicadores y filtros apilados; detalle como drawer de ancho completo |
| Teclado y accesibilidad | Controles etiquetados, foco visible y objetivos táctiles de 44 px o más |

## Tareas

- [x] Cambiar la etiqueta según rol y construir el tablero administrativo.
- [x] Integrar detalle y cobro real reutilizando Caja.
- [x] Mantener intacta la experiencia del mozo.
- [x] `npm run lint`, `npx tsc --noEmit` y revisión visual sin errores.
- [x] Presentar el cobro de Órdenes como modal centrado con total destacado, métodos en cuadrícula (incluidos Personal y Apps de delivery) y acceso directo a pago mixto.
