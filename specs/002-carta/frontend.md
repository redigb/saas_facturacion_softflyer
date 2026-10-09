# 002 — Frontend

## Para quién y dónde

**El dueño o administrador**, normalmente en su laptop o tablet, antes de abrir el local o en un rato libre. Carga la carta una vez y después hace cambios puntuales: subir un precio, sacar un plato que se acabó. No sabe ni le interesa qué es "NIU" o "afectación 10".

La pantalla debe sentirse como ordenar una carta física, no como llenar un formulario contable.

## Flujo

1. Entra a **Carta** desde el menú (hoy el ítem existe sin enlace).
2. **Primera vez (carta vacía):** ve un mensaje amable y tres pasos: crear una categoría → agregar un plato → (opcional) estaciones y modificadores. Botón principal: "Crear mi primera categoría".
3. **Con carta:** a la izquierda las categorías (con su color y cuántos platos tienen); a la derecha los productos de la categoría elegida, con nombre, precio y un interruptor de activo.
4. **Agregar plato:** panel lateral con solo lo esencial (nombre, precio, categoría). "Más opciones" despliega descripción, estación, modificadores y tipo. Guardar deja el panel listo para el siguiente plato ("Guardar y agregar otro").
5. **Editar precio rápido:** clic en el precio de la lista → se edita en el mismo lugar → Enter guarda.
6. **Desactivar** ("se acabó el ceviche"): interruptor en la fila, efecto inmediato.
7. **Reordenar categorías:** arrastrar y soltar.
8. Pestañas secundarias: **Estaciones** y **Modificadores**.

## Experiencia

| Tema | Decisión |
|---|---|
| Velocidad percibida | **Optimista** en interruptor de activo, precio rápido y reordenar: cambia al instante y se revierte con aviso si la API falla |
| Cargando | Esqueleto de la lista, nunca pantalla en blanco ni spinner a pantalla completa |
| Vacío | Ilustración simple + los tres pasos + botón principal |
| Error de validación | El `detalles` de la API se muestra bajo cada campo; el foco va al primer campo con error |
| Error de red | Aviso no bloqueante ("No se guardó, reintentar") sin perder lo escrito |
| Confirmaciones | Solo para borrar; desactivar no pide confirmación (es reversible) |
| Precio | Siempre `S/ 42.00`; se teclea `42` o `42.5` y se formatea al salir del campo |
| Sin permiso | El mozo o cajero ve la carta en modo lectura: sin botones de crear/editar, sin mensajes de error |
| Celular/tablet | Categorías pasan a una barra horizontal deslizable arriba; el panel lateral ocupa la pantalla completa |
| Teclado | Tab ordenado, Enter guarda, Esc cierra el panel; etiquetas en todos los campos |
| Consistencia | Identidad Softflyer: Montserrat, celeste/azul/amarillo, mismos componentes del panel actual |

## Base técnica que esta spec deja instalada (la usan todas las pantallas siguientes)

- **Proxy de Next** `app/api/[...path]/route.ts`: reenvía al backend con la cookie httpOnly; el token nunca llega al JavaScript del navegador.
- **React Query** para leer y mutar (cache, revalidación y actualizaciones optimistas).
- **Zod**: esquemas del contrato de `backend.md`; validan en el formulario y tipan las respuestas.
- **React Hook Form** con el resolver de Zod.

## Tareas

- [x] Instalar React Query, Zod, React Hook Form y el resolver de Zod
- [x] Proxy `app/api/[...path]/route.ts` (reenvía host, cookie y errores sin cambiarlos)
- [x] Cliente de API para el navegador + `QueryClientProvider` en el panel
- [x] Esquemas Zod del contrato (categoría, producto, grupo, carta)
- [x] Enlace "Carta" en el menú
- [x] Estado vacío con los tres pasos
- [x] Lista de categorías con reordenar (arrastrar) y lista de productos por categoría
- [x] Panel de producto: esencial + "Más opciones" + "Guardar y agregar otro"
- [x] Edición rápida de precio e interruptor de activo (optimistas)
- [x] Pestañas Estaciones y Modificadores
- [x] Modo lectura sin permisos `productos.*`
- [ ] Revisión visual en navegador: escritorio, celular y tablet (pendiente: hacerla a mano)
- [x] `npm run lint` y `npx tsc --noEmit` sin errores

## Estado (2026-10-08)

- Código: `src/app/api/[...path]/route.ts` (proxy), `src/lib/browser-api.ts`, `src/lib/schemas/carta.ts`, `src/app/panel/providers.tsx` (React Query + avisos) y `src/app/panel/carta/*`.
- Verificado: `tsc` y `eslint` sin errores; contra los servidores reales, el proxy reenvía cookie y subdominio, rechaza escrituras sin `Origin` (403 `ORIGEN_NO_PERMITIDO`), devuelve los 422 con `detalles`, el ETag/304 de `/carta` pasa por el proxy y `/panel/carta` responde 200.
- No verificado todavía: cómo se ve y se siente en el navegador (no hubo navegador disponible en esta sesión). La spec no se cierra hasta esa revisión.
- Decisión: el editor carga toda la carta en memoria (páginas de 100) y filtra/busca en el cliente: es instantáneo y una carta de restaurante rara vez pasa de 200 productos.
- Decisión: reordenar categorías arrastrando solo en escritorio; en celular las categorías son una barra horizontal.
