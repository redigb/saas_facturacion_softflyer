# NNN — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Errores con el formato del Doc. 07 §3.3.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/recurso` | — | 200 lista |

### Recurso

```json
{ "data": { "id": 1 } }
```

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|

## Decisiones

- Decisión y su motivo.

## Tareas

- [ ] Tarea
- [ ] Pruebas en verde (`php artisan test`)
