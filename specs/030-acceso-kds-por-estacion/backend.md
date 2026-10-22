# 030 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Errores con el formato del Doc. 07 §3.3.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/cocina/estaciones` | `restaurante.cocina.actualizar_estado` o `panel.ver` | Estaciones KDS autorizadas para la sesión |
| GET | `/cocina/accesos/{usuario}` | `usuarios.editar` | Asignación KDS de la persona |
| PUT | `/cocina/accesos/{usuario}` | `usuarios.editar` | Reemplaza la asignación KDS |

### Estaciones autorizadas

```json
{
  "data": [
    { "id": 3, "nombre": "Cocina" },
    { "id": "general", "nombre": "General (sin estación)" }
  ]
}
```

- Un supervisor con `panel.ver` recibe todas las estaciones activas y General.
- Un cocinero recibe solo sus asignaciones activas.

### Asignación de una persona

```json
{
  "data": {
    "usuario_id": 7,
    "estacion_ids": [3],
    "general": false
  }
}
```

`PUT` recibe `{ "estacion_ids": [3], "general": false }`. Una lista vacía es válida y deja al trabajador sin acceso al KDS hasta una nueva asignación.

## Decisiones

- La tabla `usuario_estacion_preparacion` vive en `Modules/Restaurant`: el módulo puede referenciar usuarios del Core, pero el Core no depende del módulo.
- Una fila con `estacion_preparacion_id = null` representa el KDS General.
- Las asignaciones existentes no se inventan durante la migración: el acceso del cocinero queda cerrado hasta que el administrador lo configure. Los supervisores no se bloquean.
- La autorización se aplica tanto a HTTP como a los canales privados de Reverb.

## Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 403 | `NO_AUTORIZADO` | El usuario intenta acceder a una estación no asignada |
| 422 | `VALIDACION` | Se intenta asignar una estación inexistente/inactiva o asignar estaciones a alguien sin permiso de cocina |

## Tareas

- [x] Migración con RLS y FK compuestas.
- [x] Caso de uso para leer, reemplazar y autorizar asignaciones.
- [x] Aplicar autorización a listado, estados, impresión y WebSocket.
- [x] Pruebas de acceso permitido, denegado, supervisor, mozo y aislamiento.
- [x] Pruebas en verde (`php artisan test`).
