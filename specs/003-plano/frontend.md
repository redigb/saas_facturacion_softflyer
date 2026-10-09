# 003 — Frontend

Sigue el skill `front-next/.agents/skills/softflyer-ui` (el pulido visual lo hace el agente de diseño; aquí se define la experiencia y la lógica).

## Para quién y dónde

**El dueño o el encargado de salón**, en la laptop o en una tablet, una vez al abrir el local y de vez en cuando (llegó una mesa nueva, se abrió la terraza). Quiere dibujar su local "como es", sin pelear con la herramienta. En el celular el plano se ve, pero no se edita: es demasiado chico para arrastrar con precisión.

## Flujo

1. Entra a **Plano del salón** desde el menú.
2. **Primera vez:** estado vacío → "Crear mi primer salón" (nombre; tamaño por defecto).
3. Arriba, pestañas con los salones y "+ Salón".
4. **Barra de herramientas:** mesas (cuadrada, redonda, rectangular) y elementos (barra, pared, puerta, ventana, columna, planta, baño, caja, cocina, texto). Un toque agrega el objeto en el centro visible, ya seleccionado. Las mesas nuevas reciben el siguiente código libre (M1, M2…).
5. **Lienzo:** arrastrar mueve (con cuadrícula de 10 unidades), la esquina inferior derecha redimensiona. Tocar el fondo deselecciona.
6. **Panel de propiedades** del objeto seleccionado: código y capacidad (mesas), etiqueta (elementos), ancho, alto, rotar ±15°, duplicar y quitar.
7. **Guardar** (botón fijo, con "Cambios sin guardar" mientras haya diferencias). Deshacer con Ctrl+Z.
8. Si otro guardó antes: aviso "Alguien actualizó este plano mientras editabas" con **Recargar** (descarta lo local) o **Revisar** (sigue editando sin guardar).

## Experiencia

| Tema | Decisión |
|---|---|
| Velocidad percibida | Todo el trabajo es local: arrastrar, redimensionar y agregar no esperan al servidor. Se guarda una vez |
| Escala | El lienzo (SVG con `viewBox` en unidades del salón) se ajusta al ancho disponible; se ve igual en cualquier pantalla |
| Cargando | Esqueleto del lienzo |
| Vacío | Ícono, explicación corta, "Crear mi primer salón" |
| Cambios sin guardar | Indicador visible y aviso del navegador al salir de la página |
| Conflicto (409) | Aviso con Recargar / Revisar; nunca se pierde el trabajo en silencio |
| Mesa en uso (409) | Aviso con los códigos de las mesas ocupadas; se restauran en el lienzo |
| Errores de validación | Se seleccionan y se marcan los objetos con error |
| Teclado | Flechas mueven 10 (Shift: 1), Supr quita, Ctrl+D duplica, Ctrl+Z deshace, Esc deselecciona |
| Táctil (tablet) | Eventos de puntero: arrastrar con el dedo; tirador de tamaño de 44px |
| Celular | Solo lectura con aviso: "Para editar el plano usa una tablet o computadora" |
| Sin permiso | Solo lectura, sin barra de herramientas |
| Mesas | Muestran código y capacidad; las ocupadas se pintan distinto (aunque en H0 todas están libres) |

## Tareas

- [x] Esquemas Zod del contrato (salón, plano, cuerpo del PUT)
- [x] Consultas y mutaciones (React Query): salones, plano, guardar con versión, reordenar
- [x] Enlace "Plano del salón" en el menú
- [x] Estado vacío y creación de salón; pestañas de salones con renombrar, ordenar y desactivar
- [x] Lienzo SVG escalable con arrastre, cuadrícula y redimensionado (puntero: mouse y táctil)
- [x] Barra de herramientas con mesas y elementos; código automático de mesa
- [x] Panel de propiedades: código, capacidad, etiqueta, tamaño, rotar, duplicar, quitar
- [x] Deshacer, atajos de teclado, indicador de cambios sin guardar y aviso al salir
- [x] Guardar con manejo de 409 `PLANO_DESACTUALIZADO` y `MESA_EN_USO`, y 422 por objeto
- [x] Solo lectura en celular y sin permiso
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-08)

- Código: `src/lib/schemas/plano.ts` y `src/app/panel/plano/*` (`editor-state.ts` es un reducer puro con deshacer; `floor-canvas.tsx` arrastra y redimensiona con eventos de puntero, mouse y táctil).
- Usa la biblioteca del agente de diseño (`@/components/ui`: `Button`, `Input`, `Switch`, `CustomSelect`, `EmptyState`) para que su pulido llegue también al plano.
- Verificado: `tsc`, `eslint` de los archivos del plano y `check_ui.py` sin errores; contra los servidores reales: crear salón, guardar plano (versión 1 → 2), 409 `PLANO_DESACTUALIZADO` con `version_actual` y `/panel/plano` responde 200. Datos de prueba borrados.
- Pulido visual y revisión en navegador: delegados al agente de diseño.
- Pendiente fuera de esta spec: el panel solo deja entrar a quien tiene `panel.ver` (Administrador); el Encargado de salón tiene `restaurante.plano.editar` pero no puede llegar a la pantalla. Se resuelve en la spec de Equipo.
