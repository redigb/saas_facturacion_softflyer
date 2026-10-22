# 031 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/preparaciones?estacion_id=` | cocina o `panel.ver` | Platos/bebidas activos de la estación autorizada |
| GET | `/preparaciones/{producto}?sucursal_id=` | cocina o `panel.ver` | Ficha completa autorizada |
| PUT | `/preparaciones/{producto}` | cocina o `panel.ver` | Reemplaza ingredientes, procedimiento y notas |

`estacion_id` acepta un id numérico o `general`. Se usa la estación efectiva del producto (asignación puntual o heredada de su categoría).

```json
{
  "data": {
    "producto": { "id": 12, "nombre": "Lomo saltado", "tipo": "PLATO", "imagen_url": null },
    "estacion": { "id": 3, "nombre": "Cocina" },
    "ingredientes": [{ "nombre": "Lomo", "cantidad": "250 g" }],
    "procedimiento": "Sellar el lomo...",
    "notas": "Usar wok bien caliente.",
    "actualizado_por": "Rosa Quispe",
    "actualizado_en": "2026-10-19T15:00:00Z"
  }
}
```

`PUT` recibe `ingredientes` (máximo 50), `procedimiento` y `notas`. Cada ingrediente recibe `nombre` obligatorio y `cantidad` opcional.

## Decisiones

- `fichas_preparacion` e `ingredientes_preparacion` viven en Restaurante y referencian productos del Core.
- Esta ficha es descriptiva; la futura tabla `recetas` de Inventario enlazará insumos y cantidades normalizadas.
- El mismo acceso por estación de la spec 030 se aplica a listado, lectura y escritura.

## Tareas

- [x] Migración, modelos y RLS.
- [x] Caso de uso con estación efectiva y autorización.
- [x] Controlador, validación y rutas.
- [x] Pruebas de Cocina, Barra, administrador, RLS y otro restaurante.
- [x] Suite completa en verde.
