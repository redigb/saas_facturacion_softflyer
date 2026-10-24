# Backend — contrato

## Permisos

- `asistencia.marcar`: consulta la jornada propia y registra su propia entrada/salida.
- `asistencia.administrar`: configura geocercas/horarios y consulta al equipo.

## Endpoints

| Método | Ruta | Permiso | Uso |
|---|---|---|---|
| GET | `/asistencia/mi-jornada?sucursal_id=` | `asistencia.marcar` | Estado y marcaciones propias del día |
| POST | `/asistencia/marcaciones` | `asistencia.marcar` | Registra el siguiente evento usando hora del servidor |
| GET | `/asistencia/resumen?sucursal_id=&fecha=` | `asistencia.administrar` | Jornadas del equipo |
| GET | `/asistencia/horarios/{usuario}` | `asistencia.administrar` | Horario recurrente del trabajador |
| PUT | `/asistencia/horarios/{usuario}` | `asistencia.administrar` | Guarda horario recurrente |
| PATCH | `/sucursales/{sucursal}` | `configuracion.sucursales` | También acepta la geocerca |

### Marcación

```json
{
  "sucursal_id": 1,
  "latitud": -12.1223456,
  "longitud": -77.0312345,
  "precision_metros": 18.4
}
```

El cliente no envía tipo ni fecha. La API alterna `ENTRADA`/`SALIDA`, fija `marcado_en`, calcula distancia y estado. Errores de negocio: `GEOCERCA_NO_CONFIGURADA`, `UBICACION_IMPRECISA`, `FUERA_DE_GEOCERCA`, `SIN_HORARIO_HOY`.

## Datos

- `sucursales`: `latitud`, `longitud`, `radio_geocerca_metros`.
- `horarios_trabajo`: usuario, sucursal, días ISO 1–7, entrada, salida, tolerancia, activo.
- `marcaciones_asistencia`: usuario, sucursal, tipo, instante de servidor, ubicación, precisión, distancia y estado.

## Tareas

- [x] Migración, restricciones y RLS.
- [x] Permisos y plantillas de rol.
- [x] Caso de uso con distancia Haversine y reloj del servidor.
- [x] Controladores y rutas.
- [x] Pruebas de permisos, geocerca, puntualidad, alternancia y RLS.

