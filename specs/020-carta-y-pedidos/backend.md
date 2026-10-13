# 020 — Backend

## Contrato

**Un cambio pequeño en un contrato existente (spec 002):** el producto dentro de `GET /carta` incluye `descripcion`.

```json
{
  "id": 15, "nombre": "Lomo saltado", "descripcion": "Con papas fritas y arroz",
  "precio_venta": "42.00", "tipo": "PLATO", "categoria_id": 3,
  "estacion_efectiva_id": 1, "modificador_grupo_ids": [2]
}
```

- `descripcion` es nullable (≤ 255), igual que en el recurso de producto de la spec 002.
- El `ETag` de `GET /carta` se calcula del cuerpo completo, así que cualquier cambio la actualiza igual que siempre.
- El resto del contrato no cambia; la nota quedó anotada en [`specs/002-carta/backend.md`](../002-carta/backend.md).

## Decisiones

- El campo viaja en el mismo payload del menú (no una llamada extra por plato): coherente con «la carta se descarga una vez y se toma el pedido sin consultar al servidor».
- La asignación de estaciones ya existía (`producto_estacion` por plato, `categoria_estacion` por categoría) y no cambia: el ajuste es de visibilidad en el formulario, no de contrato.

## Tareas

- [x] Agregar `descripcion` al payload de `GET /carta`
- [x] Pruebas en verde (`php artisan test` — 135 en verde, 2026-10-13)
