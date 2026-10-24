# 033 — Frontend

## Para quién y dónde

El cajero trabaja durante todo el turno en una PC o tablet táctil; el administrador puede revisar el desempeño desde laptop o celular. La pantalla prioriza cobros rápidos y lectura inmediata, con desplazamiento vertical como en la referencia aportada.

## Flujo

1. Sin turno abierto se conserva “Abre tu caja”.
2. Con turno se muestra el título, hora de apertura, duración y acciones: Historial, Gasto, Ingresar dinero, Retiro y Cerrar caja.
3. El resumen muestra ventas, ticket promedio, efectivo esperado y última venta.
4. Las gráficas muestran ventas por hora y distribución por método.
5. Las cuentas por cobrar conservan el drawer de cobro actual.
6. Más abajo aparecen detalle de pagos, flujo de efectivo, todas las órdenes cobradas y gastos del turno.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueletos por bloque; acciones principales siguen visibles |
| Vacío | Gráficas y tablas explican que aún no hay ventas o movimientos |
| Error | Mensaje de la API y acción Reintentar |
| Respuesta a cada acción | Drawer con indicador; al guardar se actualiza todo el tablero |
| Celular | Tarjetas a una columna, acciones desplazables y tablas en contenedores horizontales |
| Teclado y accesibilidad | Controles de 44–48 px, etiquetas explícitas, montos tabulares y foco visible |

## Tareas

- [x] Implementar cabecera, indicadores, gráficas y tablas responsive.
- [x] Separar gasto, ingreso y retiro en acciones claras.
- [x] Añadir historial de turnos en drawer.
- [x] Conservar cuentas por cobrar y comprobantes.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores; la auditoría UI no reporta avisos nuevos en Caja (conserva avisos previos de Plano/Pedidos).
