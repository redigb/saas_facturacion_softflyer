# 002 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Middleware `inquilino`, `auth:sanctum`, `cuenta.vigente`. Errores con el formato del Doc. 07 §3.3. Un recurso de otro inquilino responde 404, nunca 403 (Doc. 07 §3.3).

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/carta` | autenticado | 200 carta completa (vendible y activa) |
| GET | `/carta/catalogos` | autenticado | 200 unidades de medida y tipos de afectación IGV |
| GET | `/categorias` | autenticado | 200 lista (sin paginar, ordenada por `orden`) |
| POST | `/categorias` | `productos.crear` | 201 categoría |
| PATCH | `/categorias/{id}` | `productos.editar` | 200 categoría |
| DELETE | `/categorias/{id}` | `productos.eliminar` | 204 (borrado lógico) |
| PUT | `/categorias/orden` | `productos.editar` | 204 — cuerpo `{ "ids": [3, 1, 2] }` |
| GET | `/productos` | autenticado | 200 paginado (offset, `?pagina=&por_pagina=&categoria_id=&buscar=&activo=`) |
| GET | `/productos/{id}` | autenticado | 200 producto |
| POST | `/productos` | `productos.crear` | 201 producto |
| PATCH | `/productos/{id}` | `productos.editar` | 200 producto |
| DELETE | `/productos/{id}` | `productos.eliminar` | 204 (borrado lógico) |
| GET | `/estaciones` | autenticado | 200 lista |
| POST | `/estaciones` | `productos.crear` | 201 |
| PATCH | `/estaciones/{id}` | `productos.editar` | 200 |
| GET | `/modificador-grupos` | autenticado | 200 lista con sus modificadores |
| POST | `/modificador-grupos` | `productos.crear` | 201 grupo (con `modificadores` en el mismo cuerpo) |
| PATCH | `/modificador-grupos/{id}` | `productos.editar` | 200 grupo (reemplaza la lista de modificadores) |
| DELETE | `/modificador-grupos/{id}` | `productos.eliminar` | 204 |

### Categoría

```json
{
  "data": {
    "id": 3,
    "nombre": "Fondos",
    "color": "#2E86DE",
    "orden": 2,
    "es_activa": true,
    "estacion_preparacion_id": 1,
    "productos_count": 4
  }
}
```

Entrada (POST/PATCH): `nombre` (requerido, ≤ 80, único sin distinguir mayúsculas), `color` (`#RRGGBB`, opcional), `es_activa`, `estacion_preparacion_id` (nullable).

### Producto

```json
{
  "data": {
    "id": 15,
    "codigo": "FON-01",
    "nombre": "Lomo saltado",
    "descripcion": "Con papas fritas y arroz",
    "tipo": "PLATO",
    "categoria_id": 3,
    "precio_venta": "42.00",
    "unidad_medida": { "id": 1, "codigo": "NIU", "nombre": "Unidad" },
    "tipo_afectacion_igv": { "id": 1, "codigo": "10", "nombre": "Gravado - Operación Onerosa" },
    "estacion_preparacion_id": null,
    "estacion_efectiva_id": 1,
    "modificador_grupo_ids": [2],
    "es_vendible": true,
    "es_activo": true
  }
}
```

Entrada (POST/PATCH):
| Campo | Regla |
|---|---|
| `nombre` | requerido, ≤ 120 |
| `tipo` | `PLATO` o `BEBIDA` |
| `precio_venta` | requerido si `es_vendible`, decimal ≥ 0, 2 decimales. **Incluye IGV** |
| `categoria_id` | nullable, de este inquilino |
| `codigo` | opcional; si no llega se genera (`PRD-0001`…). Único por inquilino |
| `descripcion` | opcional, ≤ 255 |
| `unidad_medida_id` | opcional, por defecto `NIU` |
| `tipo_afectacion_igv_id` | opcional, por defecto `10` (gravado) |
| `estacion_preparacion_id` | nullable: estación puntual que sobrescribe la de la categoría |
| `modificador_grupo_ids` | arreglo opcional, en orden |
| `es_vendible`, `es_activo` | booleanos, por defecto `true` |

- `precio_venta` viaja como **string** decimal: nunca como float.
- `estacion_efectiva_id` = la del producto o, si es nula, la de su categoría. El KDS de H1 usa este campo.

### Grupo de modificadores

```json
{
  "data": {
    "id": 2,
    "nombre": "Término de la carne",
    "seleccion_minima": 1,
    "seleccion_maxima": 1,
    "modificadores": [
      { "id": 5, "nombre": "Jugoso", "precio_adicional": "0.00", "orden": 0, "es_activo": true },
      { "id": 6, "nombre": "Bien cocido", "precio_adicional": "0.00", "orden": 1, "es_activo": true }
    ]
  }
}
```

Regla: `seleccion_maxima ≥ 1` y `seleccion_minima ≤ seleccion_maxima` (además del CHECK de la base).

### `GET /carta` — para el dispositivo del mozo

```json
{
  "data": {
    "version": "2026-10-08T15:04:05Z",
    "categorias": [
      { "id": 3, "nombre": "Fondos", "color": "#2E86DE", "orden": 2, "producto_ids": [15, 16] }
    ],
    "productos": [
      { "id": 15, "nombre": "Lomo saltado", "precio_venta": "42.00", "tipo": "PLATO",
        "categoria_id": 3, "estacion_efectiva_id": 1, "modificador_grupo_ids": [2] }
    ],
    "modificador_grupos": [ { "id": 2, "nombre": "Término de la carne", "seleccion_minima": 1, "seleccion_maxima": 1, "modificadores": [] } ],
    "estaciones": [ { "id": 1, "nombre": "Cocina" } ]
  }
}
```

- Solo productos `es_activo` y `es_vendible`, categorías activas y modificadores activos.
- Forma **normalizada** (listas por id): el cliente arma la vista sin duplicar datos.
- `version` = el `actualizado_en` más reciente de la carta: el cliente la usa para saber si su copia está vieja. Responde con `ETag` y acepta `If-None-Match` → 304.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `VALIDACION` | Campos inválidos, nombre de categoría o código de producto repetido |
| 409 | `CATEGORIA_CON_PRODUCTOS` | Borrar una categoría que tiene productos activos |
| 409 | `GRUPO_EN_USO` | Borrar un grupo de modificadores asignado a productos |

## Decisiones

- **Dónde vive:** categorías y productos son del Core (`Core/Inventory`); estaciones, modificadores y `GET /carta` son del módulo (`Modules/Restaurant`). El controlador de producto del módulo guarda lo del Core y luego `producto_estacion` y `producto_modificador_grupo`, así el Core no conoce al módulo (Doc. 08 §15).
- **Borrado lógico** en categorías y productos (ya tienen `eliminado_en`): las ventas futuras los referencian.
- **Sin idempotencia aquí:** crear dos veces una categoría por un reintento lo frena la unicidad del nombre; no es una operación tributaria ni de dinero.
- **Cambio de precio** debería quedar en `bitacora_auditoria` (Doc. 08 §12), pero esa tabla es del lote 10: se anota como pendiente, no se bloquea esta spec.

## Tareas

- [x] Relaciones Eloquent: categoría ↔ productos, unidad, afectación, estación, grupos
- [x] Form Requests con las reglas del contrato y mensajes en español
- [x] Resources con la forma exacta del contrato (precios como string)
- [x] CRUD de categorías + reordenar
- [x] CRUD de productos con valores por defecto (NIU, afectación 10, código generado)
- [x] CRUD de estaciones y grupos de modificadores
- [x] `GET /carta` normalizada con `version` y `ETag`/304
- [x] `GET /carta/catalogos`
- [x] Pruebas: permisos (mozo lee, no escribe), validaciones, 404 entre inquilinos, borrado con productos → 409, estación efectiva, carta solo con lo activo, 304
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: `app/Modules/Restaurant/{Application/ManageMenu, Application/GetMenu, Infrastructure/Persistence/MenuAssignments, Presentation/MenuPresenter, Presentation/Controllers/*, Presentation/Requests/*}`; relaciones en `Core/Inventory` y catálogos `UnitOfMeasure` / `IgvAffectationType` en `Core/Billing`.
- Pruebas: `tests/Feature/Restaurant/MenuTest.php` (11 casos). Suite completa: 63 en verde como `softflyer_app`.
- El `ETag` de `GET /carta` es el hash del cuerpo completo (no la fecha): cualquier cambio, incluido un borrado, cambia el ETag.
- Pendiente anotado: al llegar H1, los modificadores borrados de un grupo deberán desactivarse en vez de borrarse si ya están en pedidos.
