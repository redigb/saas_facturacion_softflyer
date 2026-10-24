# 024 — Backend

## Contrato

**Sin cambios.** Todo lo necesario ya existía:

| Fuente | Uso |
|---|---|
| Rol «Mozo» (`roles_plantilla`, config/softflyer.php) | Permisos `restaurante.pedidos.crear` + `clientes.ver` |
| `GET /pedidos` (spec 006) | Pedidos activos con su `mozo { id, nombre }`: «Mis órdenes» filtra por el usuario |
| `GET /auth/yo` | Permisos y usuario para el menú y la pantalla nueva |
| `POST /usuarios` (spec 004) | Crear la cuenta de mozo de prueba del E2E |

## Decisiones

- «Mis órdenes» se resuelve en el cliente filtrando la lista activa de siempre: sin endpoint nuevo ni campos extra.
- La Carta ya permite lectura autenticada (`GET /carta` y catálogos); el candado de edición es de permisos en el frontend, así que el modo lectura no necesita backend nuevo.

## Tareas

- [x] Confirmar que rol, permisos y listados existentes cubren la vista del mozo (probado en el E2E con la cuenta de Rosa)
