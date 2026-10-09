# 003 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Middleware `inquilino`, `auth:sanctum`, `cuenta.vigente`. Errores con el formato del Doc. 07 §3.3; recurso de otro inquilino → 404.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/salones` | autenticado | 200 lista (`?sucursal_id=` opcional), ordenada por `orden` |
| POST | `/salones` | `restaurante.plano.editar` | 201 salón |
| PATCH | `/salones/{id}` | `restaurante.plano.editar` | 200 salón (nombre, es_activo) |
| DELETE | `/salones/{id}` | `restaurante.plano.editar` | 204 (borrado lógico) |
| PUT | `/salones/orden` | `restaurante.plano.editar` | 204 — `{ "ids": [2, 1] }` |
| GET | `/salones/{id}/plano` | autenticado | 200 plano completo |
| PUT | `/salones/{id}/plano` | `restaurante.plano.editar` | 200 plano guardado (version + 1) |

### Salón

```json
{
  "data": {
    "id": 1,
    "sucursal_id": 1,
    "nombre": "Salón principal",
    "ancho": 1000,
    "alto": 700,
    "orden": 0,
    "version": 3,
    "es_activo": true,
    "mesas_count": 9
  }
}
```

POST: `nombre` (requerido, ≤ 60, único por sucursal sin distinguir mayúsculas), `ancho` y `alto` (opcionales, 200–5000, por defecto 1000 × 700), `sucursal_id` (opcional: por defecto la principal).

### Plano

```json
{
  "data": {
    "salon": { "id": 1, "nombre": "Salón principal", "ancho": 1000, "alto": 700, "version": 3 },
    "mesas": [
      { "id": 4, "codigo": "M1", "capacidad": 4, "forma": "CUADRADA",
        "pos_x": 80, "pos_y": 80, "ancho": 110, "alto": 110, "rotacion": 0, "estado": "LIBRE" }
    ],
    "elementos": [
      { "id": 9, "tipo": "BARRA", "etiqueta": "Barra", "pos_x": 760, "pos_y": 60, "ancho": 200, "alto": 70, "rotacion": 0, "capa": 0 }
    ]
  }
}
```

- Las medidas viajan como **número** (unidades de lienzo, hasta 2 decimales). Solo las mesas activas aparecen.
- `estado` es de solo lectura (lo cambian los pedidos en H1).

### `PUT /salones/{id}/plano` — guardar todo

```json
{
  "version": 3,
  "ancho": 1000,
  "alto": 700,
  "mesas": [
    { "id": 4, "codigo": "M1", "capacidad": 4, "forma": "CUADRADA", "pos_x": 90, "pos_y": 80, "ancho": 110, "alto": 110, "rotacion": 0 },
    { "codigo": "M10", "capacidad": 2, "forma": "REDONDA", "pos_x": 300, "pos_y": 500, "ancho": 90, "alto": 90, "rotacion": 0 }
  ],
  "elementos": [
    { "tipo": "PUERTA", "etiqueta": "Ingreso", "pos_x": 440, "pos_y": 688, "ancho": 120, "alto": 12, "rotacion": 0, "capa": 0 }
  ]
}
```

| Regla | Detalle |
|---|---|
| `version` | Requerida. Si no coincide con la actual → **409 `PLANO_DESACTUALIZADO`** y `detalles.version_actual` |
| Mesas con `id` | Se actualizan (deben ser de este salón) |
| Mesas sin `id` | Se crean; si existe una mesa **inactiva** con ese código en el salón, se reactiva |
| Mesas ausentes | Se **desactivan** (`es_activa = false`), no se borran |
| Mesa ausente no `LIBRE` | **409 `MESA_EN_USO`** |
| Elementos | Se reemplazan completos (no tienen historial) |
| `codigo` | Requerido, ≤ 10, mayúsculas, sin repetir dentro del cuerpo |
| `capacidad` | 1–50 |
| `forma` | `CUADRADA`, `REDONDA`, `RECTANGULAR` |
| `tipo` | `BARRA`, `PARED`, `PUERTA`, `VENTANA`, `COLUMNA`, `PLANTA`, `BANO`, `CAJA`, `COCINA`, `TEXTO` |
| Geometría | `pos_x`, `pos_y` ≥ 0 y dentro del lienzo; `ancho`, `alto` > 0; `rotacion` 0–359 |
| Límite | Hasta 300 mesas y 300 elementos por salón |

Todo en una transacción: si algo falla, el plano queda como estaba.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `VALIDACION` | Campos inválidos, códigos repetidos, elemento fuera del lienzo, nombre de salón repetido |
| 409 | `PLANO_DESACTUALIZADO` | Otra persona guardó antes (`detalles.version_actual`) |
| 409 | `MESA_EN_USO` | Se intenta quitar una mesa ocupada o por cobrar (`detalles.mesas`: códigos) |
| 409 | `SALON_EN_USO` | Se intenta borrar un salón con mesas ocupadas |

## Decisiones

- **Guardado completo con bloqueo optimista** (Doc. 08 §7 `salones.version`) en vez de un endpoint por mesa: el editor trabaja en local, sin latencia, y guarda una vez.
- El bloqueo se toma con `SELECT ... FOR UPDATE` sobre el salón: dos guardados simultáneos con la misma versión no pueden pasar ambos.
- Sin idempotencia: el `PUT` con `version` ya es seguro ante reintentos (el segundo recibe 409 o deja el mismo resultado).

## Tareas

- [x] Modelos: casts de geometría, relaciones salón ↔ mesas activas ↔ elementos
- [x] CRUD de salones + reordenar (sucursal principal por defecto)
- [x] `GET /salones/{id}/plano`
- [x] `PUT /salones/{id}/plano`: versión con `FOR UPDATE`, mesas (actualizar, crear, reactivar, desactivar), elementos reemplazados, todo en transacción
- [x] Validaciones: códigos únicos en el cuerpo, geometría dentro del lienzo, límites
- [x] Pruebas: guardar y leer, 409 por versión, desactivar y reactivar mesas, 409 mesa en uso, permisos (mozo lee, no escribe), 404 entre inquilinos, validaciones
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: `Modules/Restaurant/Application/ManageFloorPlan`, `Presentation/Controllers/DiningRoomController`, `Presentation/Requests/FloorPlanRequest`; casts y `activeTables()` en los modelos.
- Pruebas: `tests/Feature/Restaurant/FloorPlanTest.php` (10 casos, incluye intercambio de códigos M1↔M2). Suite: 73 en verde como `softflyer_app`.
- Detalle de implementación: para respetar `UNIQUE (salon_id, codigo)` al intercambiar o reutilizar códigos, las mesas se "estacionan" con un código temporal `~{id}` dentro de la transacción antes de asignar el final.
