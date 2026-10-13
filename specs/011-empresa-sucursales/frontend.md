# 011 — Frontend

## Para quién y dónde

El dueño o gerente en su laptop, una vez al configurar el negocio y de vez en cuando después. Es una pantalla de gestión: se prioriza claridad y errores bien explicados sobre velocidad táctil.

## Flujo

1. Menú **Configuración** → `/panel/configuracion`, con dos pestañas: **Empresa** y **Sucursales**.
2. **Empresa:** formulario con RUC, razón social, nombre comercial, dirección fiscal y distrito (buscador que sugiere mientras escribe). Botón **Guardar cambios**, habilitado solo si algo cambió.
3. **Sucursales:** lista de tarjetas con nombre, dirección, distrito, código de establecimiento y marcas *Principal* / *Inactiva*. Encima, el contador del plan: "2 de 3 sucursales".
4. **Nueva sucursal** abre un panel lateral con sus campos; **Editar** reutiliza el mismo panel.
5. Cada tarjeta ofrece **Hacer principal** y **Desactivar / Activar**, con confirmación breve cuando hay consecuencias.
6. Tras guardar una sucursal, el selector de sucursal y el resto del panel se refrescan.
7. En **Inicio**, el paso "Datos fiscales" del checklist enlaza aquí.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueleto del formulario y de las tarjetas; nunca pantalla en blanco |
| Vacío | No aplica: siempre hay empresa y al menos una sucursal |
| RUC inválido | Mensaje junto al campo ("El RUC no es válido…"); los demás cambios no se pierden |
| Límite del plan | Aviso con el número del plan y el botón de nueva sucursal deshabilitado con explicación |
| Desactivar | Si es la principal o la última, el botón explica por qué no se puede; si tiene actividad, muestra el motivo de la API |
| Guardado | Aviso breve "Cambios guardados"; el botón vuelve a deshabilitarse |
| Distrito | Buscador con teclado (↑ ↓ Enter), mínimo 2 letras, muestra "Distrito, Provincia, Departamento" |
| Celular | Una columna; el panel lateral ocupa toda la pantalla (patrón del Drawer) |
| Accesibilidad | Etiquetas visibles, errores asociados al campo, foco al primer campo con error |
| Permisos | Sin `configuracion.empresa` no se ve la pestaña Empresa; sin `configuracion.sucursales`, no la de Sucursales |

## Tareas

- [x] Enlace "Configuración" con ruta en la navegación (permisos `configuracion.empresa` y `configuracion.sucursales`)
- [x] Pestaña **Empresa** con validación y buscador de distrito
- [x] Pestaña **Sucursales**: lista, panel de alta/edición, principal, activar/desactivar
- [x] Enlaces del checklist del Inicio con `ruta`; pasos sin ruta como "Próximamente"
- [x] `npm run lint` y `npx tsc --noEmit` sin errores

## Cierre del frontend (2026-10-12)

- Código: `app/panel/configuracion/{page, configuration-view, company-tab, branches-tab, ubigeo-picker, queries}.tsx`, `lib/schemas/configuracion.ts`; el menú "Configuración" ya tiene ruta; el checklist del Inicio muestra "Completar" (con enlace), "Pendiente" o "Próximamente" según `ruta`.
- Al guardar, `router.refresh()` actualiza el layout (selector de sucursal, checklist).
- `npx tsc --noEmit` y `npm run lint` sin errores; `check_ui.py` sin avisos en los archivos nuevos.

### Verificación manual pendiente

1. Abrir **Configuración** como administrador: se ven los datos de la empresa.
2. Poner un RUC inválido (por ejemplo `20100070971`): el error sale junto al campo y no se pierde lo demás.
3. Elegir un distrito escribiendo "mira" y guardar; volver al Inicio y ver el paso "Datos fiscales" completo.
4. Crear una sucursal hasta llegar al límite del plan (3): el botón se deshabilita con aviso.
5. Hacer principal otra sucursal y desactivar la anterior; intentar desactivar con un pedido abierto y leer el motivo.
