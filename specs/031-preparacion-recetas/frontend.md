# 031 — Frontend

## Para quién y dónde

- **Administrador:** ve todas las estaciones y todas las fichas.
- **Cocina/Barra:** ve únicamente sus estaciones asignadas.
- Ruta: `/panel/preparacion`, optimizada para celular y tablet.

## Flujo

1. Elegir una estación autorizada si hay más de una.
2. Buscar visualmente el plato o bebida.
3. Abrir su ficha y consultar ingredientes, procedimiento y anotaciones.
4. Editar en el mismo panel, agregar o quitar ingredientes y guardar.

## Experiencia

- Tarjetas grandes por plato, con foto si existe y estado «Completa» o «Por completar».
- Ingredientes en filas táctiles de nombre y cantidad.
- Textareas de 16 px para evitar zoom móvil.
- Estado vacío claro cuando la estación no tiene platos.
- Guardado con error visible y sin perder lo escrito.

## Tareas

- [x] Esquemas y consultas.
- [x] Selector de estación y tarjetas de platos.
- [x] Drawer táctil de receta.
- [x] Navegación para administrador y Cocina/Barra.
- [x] TypeScript, ESLint y auditoría Softflyer UI.
