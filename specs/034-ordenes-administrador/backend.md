# 034 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Errores con el formato del Doc. 07 §3.3.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/pedidos?estado=ABIERTO,POR_COBRAR,CERRADO&fecha=AAAA-MM-DD` | `restaurante.pedidos.crear` o `panel.ver` | 200 lista resumida |

### Resumen de pedido

El resumen existente incorpora `cerrado_en` y `detalles_resumen` con nombre, cantidad y subtotal de cada ítem no anulado. `fecha` filtra por `fecha_operacion` y solo permite fechas válidas.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | validación | `fecha` o `estado` no tienen formato válido |

## Decisiones

- La vista diaria consulta pedidos, no comprobantes: el total representa órdenes cerradas del día y evita mezclar jornadas.
- El acceso sigue limitado a las sucursales asignadas al usuario.
- `PERSONAL` y `APPS_DELIVERY` son medios no efectivos auditables; pueden registrar una referencia y no alteran el efectivo esperado.

## Tareas

- [x] Extender el listado y su presentador.
- [x] Cubrir fecha, sucursal y nuevos campos con pruebas.
- [x] Pruebas en verde (`php artisan test`).
- [x] Incorporar Personal y Apps de delivery al catálogo de medios de pago existente y a nuevas instalaciones.
