# 030 — Acceso al KDS por estación

**Estado:** Cerrada
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (seguridad operativa)
**Documentos:** Doc. 06 §6 · Doc. 08 §4, §5 y §8 · specs 004, 007 y 008

## Qué y por qué

El permiso de cocina permite hoy elegir cualquier estación del restaurante. Eso hace posible que un cocinero vea y opere comandas de Barra, Parrilla o Postres aunque no trabaje allí.

El administrador asignará a cada trabajador las estaciones que atiende desde **Equipo**. El KDS solo ofrecerá esas estaciones y el backend aplicará la misma restricción a consultas, cambios de estado, impresión y canales en vivo.

## Criterios de aceptación

- [x] El administrador asigna una o varias estaciones KDS a una persona con rol de cocina.
- [x] También puede asignar «General» para platos que no tienen estación configurada.
- [x] Un cocinero solo ve en el selector las estaciones asignadas.
- [x] Un cocinero no puede consultar, actualizar, imprimir ni escuchar por WebSocket una estación no asignada.
- [x] Un mozo conserva la posibilidad de marcar como entregado un plato listo.
- [x] Administradores y usuarios con `panel.ver` pueden supervisar todas las estaciones.
- [x] Si no hay estaciones asignadas, el KDS explica que debe pedir la asignación al administrador.
- [x] La asignación respeta RLS y nunca cruza restaurantes.

## Fuera de alcance

- Estaciones distintas por sucursal; las estaciones actuales pertenecen al restaurante completo.
- Crear nuevos roles o permisos personalizados.
- Vincular una impresora física a una estación (spec 028).

## Verificación

- `php artisan test`: 148 pruebas, 1,133 aserciones.
- `npx tsc --noEmit`: sin errores.
- `npx eslint .`: sin errores.
- Auditoría Softflyer UI de los componentes modificados: sin advertencias.
