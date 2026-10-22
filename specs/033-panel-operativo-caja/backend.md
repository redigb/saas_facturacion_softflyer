# 033 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Extiende la spec 009.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/sesiones-caja/{id}/resumen` | `caja.ver_movimientos` | Turno, resumen operativo, órdenes cobradas y movimientos |
| GET | `/sesiones-caja/historial?limite=10` | `caja.ver_movimientos` | Turnos recientes de sucursales permitidas |
| POST | `/sesiones-caja/{id}/movimientos` | `caja.registrar_movimiento_manual` | Registra ingreso o egreso con categoría |

### Resumen operativo

`resumen` conserva los campos de la spec 009 y suma:

```json
{
  "ticket_promedio": "112.40",
  "ultima_venta": { "monto": "350.00", "creado_en": "2026-10-20T21:52:00Z" },
  "ventas_por_hora": [{ "hora": "17:00", "monto": "42.00", "cantidad": 1 }],
  "ordenes": [{
    "venta_id": 15,
    "pedido_id": 31,
    "numero": 5,
    "tipo": "SALON",
    "mesa": "M4",
    "items": 3,
    "metodos_pago": ["Efectivo"],
    "total": "60.00",
    "cobrado_por": "Yan Chota",
    "creado_en": "2026-10-20T21:44:00Z"
  }]
}
```

Los movimientos incorporan `categoria`. Valores operativos: `SALARIOS`, `ABARROTES`, `SERVICIOS`, `INSUMOS`, `MANTENIMIENTO`, `OTROS`, `RETIRO` e `INGRESO`.

### Errores propios

Se conservan los de la spec 009. Una categoría inválida responde `422 VALIDACION`.

## Decisiones

- Las ventas se agrupan por la hora local de la sucursal a partir de `ventas.creado_en`.
- Una venta puede cubrir parte de un pedido; la tabla presenta cada venta cobrada como una orden de cobro auditable.
- Gasto y retiro son ambos egresos para el arqueo, pero su categoría permite distinguir operación y retiro de efectivo.
- El historial respeta las sucursales asignadas; un turno abierto solo puede operarlo quien lo abrió.

## Tareas

- [x] Migrar categoría de movimientos de caja con RLS existente intacto.
- [x] Ampliar resumen e historial.
- [x] Cubrir resumen, categorías, historial y alcance por sucursal con pruebas.
- [x] Pruebas en verde (`php artisan test`): 160 pruebas, 1291 aserciones.
