# 039 — Backend

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`.

## Promociones

### Esquema

`promociones` (RLS): `nombre`, `descripcion`, `tipo` (`PORCENTAJE` | `PRECIO_FIJO`), `valor`,
`desde`, `hasta`, `dias_semana` (JSON ISO 1–7, vacío = todos), `hora_inicio`, `hora_fin`,
`prioridad` (0–99), `es_activa`.

Pivotes con RLS: `promocion_producto` y `promocion_categoria`.
`detalle_pedidos` suma `descuento` (total de la línea) y `promocion_nombre` (foto del nombre).

### Contrato

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/promociones` | `productos.crear` \| `productos.editar` \| `productos.eliminar` \| `panel.ver` |
| POST | `/promociones` | `productos.crear` |
| PATCH | `/promociones/{promotion}` | `productos.editar` |
| DELETE | `/promociones/{promotion}` | `productos.eliminar` |

```json
{
  "id": 4,
  "nombre": "Happy hour -20%",
  "descripcion": "Solo de lunes a viernes",
  "tipo": "PORCENTAJE",
  "valor": "20.00",
  "desde": "2026-11-03T13:00:00Z",
  "hasta": "2026-11-04T03:00:00Z",
  "dias_semana": [1, 2, 3, 4, 5],
  "hora_inicio": "18:00:00",
  "hora_fin": "21:00:00",
  "prioridad": 0,
  "es_activa": true,
  "aplica_ahora": true,
  "estado": "VIGENTE",
  "productos": [{ "id": 7, "nombre": "Chicha morada" }],
  "categorias": [{ "id": 2, "nombre": "Bebidas" }],
  "alcance": "MIXTO"
}
```

`desde`/`hasta` se envían como hora de Perú y se guardan en UTC. Categorías y platos pueden
combinarse (se aplica la promo si el plato está directo **o** en una categoría incluida).

### Resolución del precio

1. Candidatas: activas, dentro de fechas, día ISO y horario de Perú.
2. Orden: `prioridad DESC`, luego alcance directo al plato antes que su categoría, luego `id DESC`.
3. `PORCENTAJE` → `precio × (1 − valor/100)`; `PRECIO_FIJO` → `valor`.
4. Si el resultado no es menor al precio de lista, la promo no se aplica.

Resultado por producto: `precio_promocional`, `descuento` y `promocion {id, nombre, tipo, valor}`.
`GET /carta` los incluye; su versión/ETag cambia cuando cambia una promoción.
`POST /pedidos/{id}/comandas` congela `precio_unitario`, `descuento` y `promocion_nombre`.
`POST /pedidos/{id}/cobro` copia el descuento a `detalle_ventas.descuento`.

## Analíticas

`GET /analiticas?desde=2026-01-01&hasta=2026-12-31&sucursal_id=1&agrupar=mes` — permiso `reportes.ventas`.

- Defaults: mes actual; `agrupar` automático (día ≤ 62 días, mes ≤ 2 años, año si es mayor).
- Solo ventas `EMITIDA`; fechas y agrupaciones en `America/Lima`.
- Comparación con el rango anterior de igual duración.
- `sucursal_id` debe pertenecer al usuario (`worksAt`), si no `403`.

Respuesta:

```json
{
  "rango": { "desde": "2026-01-01", "hasta": "2026-12-31", "agrupar": "mes", "comparacion": { "desde": "2025-12-01", "hasta": "2025-12-31" } },
  "kpis": { "ventas": "12500.00", "ventas_centavos": 1250000, "ordenes": 320, "ticket_promedio": "39.06", "ticket_centavos": 3906, "platos": 890, "igv": "1906.78", "propinas": "0.00" },
  "comparacion": { "ventas_pct": 12.5, "ordenes_pct": 8.1, "ticket_pct": 4.0, "platos_pct": 6.2 },
  "serie": [{ "periodo": "2026-01", "etiqueta": "ene 2026", "ventas": "980.00", "ordenes": 25 }],
  "por_anio": [{ "anio": 2026, "ventas": "12500.00", "ordenes": 320 }],
  "top_platos": [{ "producto_id": 7, "nombre": "Lomo saltado", "cantidad": "42", "ventas": "1764.00", "participacion": 14.1 }],
  "top_categorias": [{ "categoria_id": 2, "nombre": "Fondos", "cantidad": "120", "ventas": "4200.00" }],
  "por_metodo": [{ "codigo": "EFECTIVO", "nombre": "Efectivo", "ventas": "7000.00", "cantidad": 210 }],
  "por_cobrador": [{ "usuario_id": 3, "nombre": "Yan Chota", "ventas": "8000.00", "ordenes": 200 }],
  "por_sucursal": [{ "sucursal_id": 1, "nombre": "Don José", "ventas": "12500.00", "ordenes": 320 }],
  "por_hora": [{ "hora": "13:00", "ventas": "1500.00", "ordenes": 40 }],
  "por_dia_semana": [{ "dia": 5, "etiqueta": "Vie", "ventas": "3000.00", "ordenes": 70 }],
  "anios": [2026, 2025],
  "sucursales": [{ "id": 1, "nombre": "Don José" }]
}
```

Índices nuevos: `detalle_ventas(producto_id)` y `ventas(estado, creado_en)`.

## Tareas

- [x] Migraciones (promociones, pivotes, descuento en el pedido, índices de analítica).
- [x] Resolución de precios y snapshot en el pedido.
- [x] CRUD de promociones con permisos y refresco de la carta.
- [x] Agregaciones de analíticas con filtros, comparación y RLS.
- [x] Pruebas `PromotionTest` y `AnalyticsTest`.
