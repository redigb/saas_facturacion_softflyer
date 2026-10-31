# 031 — Preparación y recetas operativas

**Estado:** Cerrada
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H4b (preparación)
**Documentos:** Doc. 05 §4.3 · Doc. 08 §5, §6 y §15 · spec 030

## Qué y por qué

Cocina y Barra necesitan consultar cómo se prepara cada plato o bebida desde el celular usado como KDS. El administrador también necesita ver y mantener toda la información. Cada ficha tendrá ingredientes descriptivos, procedimiento y anotaciones del equipo.

La ficha operativa se mantiene separada de la receta cuantificada de inventario: esta última enlazará insumos y descontará existencias cuando se implemente Inventario.

## Criterios de aceptación

- [x] El administrador ve las fichas de todas las estaciones.
- [x] Cocina y Barra solo ven platos/bebidas de sus estaciones KDS asignadas.
- [x] La ficha muestra ingredientes, cantidades descriptivas, procedimiento y anotaciones.
- [x] Cada ingrediente puede indicar su unidad de medida (`ONZ`, `ML`, `GR`, `KG`) — spec 038.
- [x] El personal autorizado puede crear y actualizar la ficha desde celular o tablet.
- [x] La pantalla indica quién y cuándo actualizó la preparación.
- [x] Una persona no puede consultar ni modificar preparaciones de otra estación, incluso llamando directamente a la API.
- [x] Los datos respetan RLS y nunca cruzan restaurantes.

## Fuera de alcance

- Descontar insumos o registrar existencias; corresponde a Inventario.
- Costeo de recetas y márgenes.
- Historial de versiones de una ficha.

## Verificación

- `php artisan test`: 152 pruebas, 1,171 aserciones.
- `npx eslint .` y `npx tsc --noEmit`: sin errores.
- Pint y `git diff --check`: sin errores.
- Auditoría Softflyer UI y recorrido real en navegador como administrador: correctos.
