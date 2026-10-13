# 011 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`, cuenta vigente. Errores con el formato del Doc. 07 §3.3.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/empresa` | `configuracion.empresa` | 200 la empresa del inquilino |
| PATCH | `/empresa` | `configuracion.empresa` | 200 la empresa actualizada |
| GET | `/sucursales` | `configuracion.sucursales` | 200 todas (activas e inactivas), principal primero |
| POST | `/sucursales` | `configuracion.sucursales` | 201 la sucursal creada |
| PATCH | `/sucursales/{id}` | `configuracion.sucursales` | 200 la sucursal actualizada |
| GET | `/ubigeos?q=` | cualquier usuario autenticado | 200 hasta 20 distritos que coinciden |

No hay `DELETE`: las sucursales se desactivan.

`GET /sucursales` suma `meta`: `{ "activas": 2, "max_sucursales": 3 }` (`max_sucursales` nulo = sin tope), para mostrar el uso del plan.

### Empresa

```json
{
  "data": {
    "id": 1,
    "ruc": "20100070970",
    "razon_social": "Don José SAC",
    "nombre_comercial": "Don José",
    "direccion_fiscal": "Av. Larco 123",
    "ubigeo": { "id": 3, "codigo": "150122", "departamento": "LIMA", "provincia": "LIMA", "distrito": "MIRAFLORES" },
    "homologado": false
  }
}
```

`PATCH /empresa` acepta, todos opcionales:

| Campo | Regla |
|---|---|
| `ruc` | 11 dígitos con prefijo y dígito verificador válidos (`Ruc::isValid`); no puede cambiar si ya hay comprobantes reales (`es_simulado = false`) |
| `razon_social` | 3–200 caracteres |
| `nombre_comercial` | 2–120 caracteres; no puede quedar vacío |
| `direccion_fiscal` | hasta 250 caracteres |
| `ubigeo_id` | debe existir en el catálogo |

`clave_sol_cifrada`, `usuario_sol`, `homologado` y `aplica_tasa_reducida` **no** se editan aquí (spec 017).

### Sucursal

```json
{
  "id": 2, "nombre": "Local San Isidro", "direccion": "Av. Javier Prado 500",
  "ubigeo": { "id": 1, "codigo": "150101", "departamento": "LIMA", "provincia": "LIMA", "distrito": "LIMA" },
  "codigo_establecimiento": "0001", "es_principal": false, "es_activa": true
}
```

`POST` y `PATCH /sucursales`:

| Campo | Regla |
|---|---|
| `nombre` | requerido al crear, 2–100 caracteres |
| `direccion` | hasta 250 caracteres |
| `ubigeo_id` | debe existir |
| `codigo_establecimiento` | 4 dígitos, único en la empresa (`0000` = domicilio fiscal); al crear, por defecto el siguiente libre |
| `es_activa` | solo en `PATCH` |
| `es_principal` | solo `true` en `PATCH` (cualquier otro valor da 422): la anterior principal deja de serlo en la misma transacción |

### Ubigeos

`GET /ubigeos?q=mira` → `{ "data": [ { "id", "codigo", "departamento", "provincia", "distrito" } ] }`. `q` de 2 a 60 caracteres; busca por distrito, provincia o código, sin importar tildes ni mayúsculas.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 429 | `LIMITE_PLAN_ALCANZADO` | Crear o reactivar una sucursal por encima de `max_sucursales` del plan |
| 409 | `RUC_CON_COMPROBANTES` | Cambiar el RUC con comprobantes reales emitidos |
| 409 | `SUCURSAL_PRINCIPAL` | Desactivar la sucursal principal (primero se marca otra) |
| 409 | `ULTIMA_SUCURSAL` | Desactivar la única sucursal activa |
| 409 | `SUCURSAL_CON_ACTIVIDAD` | Desactivar una sucursal con pedidos abiertos o un turno de caja abierto |
| 422 | `VALIDACION` | RUC inválido, código de establecimiento repetido o mal formado, ubigeo inexistente |

### `GET /panel/resumen` (se amplía)

Cada paso de `configuracion` suma `ruta` (cadena o `null`):

| Paso | `ruta` |
|---|---|
| `datos_fiscales` | `/panel/configuracion` |
| `plano` | `/panel/plano` |
| `carta` | `/panel/carta` |
| `equipo` | `/panel/equipo` |
| `series`, `certificado`, `sunat` | `null` (llegan con la facturación real) |

## Decisiones

- **Una empresa por inquilino hoy:** `GET/PATCH /empresa` operan sobre la única empresa; varias razones sociales por restaurante no existen en el producto.
- **Se desactiva, no se borra:** la sucursal tiene pedidos, turnos, series y comprobantes que cuelgan de ella (Doc. 08).
- **Una sola principal, por transacción:** el índice único parcial ya existente (`sucursales_una_principal`) es la red de seguridad; la aplicación demota la anterior antes de promover.
- **Límite del plan al reactivar también:** contar solo activas; reactivar cuenta como crear.
- **Efecto en el equipo:** `User::branches()` ya filtra `es_activa`, así que una sucursal desactivada desaparece de pedidos, caja y cocina sin más cambios. Los roles por sucursal siguen en `rol_usuario`: al reactivarla, vuelven a aplicar.
- **Nueva sucursal y roles:** solo los usuarios con rol global la ven al instante; a los demás se les asigna desde Equipo.
- **Contador de uso:** `uso_inquilino.sucursales_activas` se refresca al crear y activar/desactivar (como `usuarios_activos`).

## Tareas

- [x] `ManageCompany` y `ManageBranches` en `Core/Tenancy/Application`
- [x] Controladores, requests y rutas (`Core/Tenancy/Presentation`)
- [x] `GET /ubigeos`
- [x] `ruta` en los pasos del checklist (`GetDashboardSummary`)
- [x] Contador `sucursales_activas`
- [x] Pruebas: leer/editar empresa, RUC inválido, RUC con comprobantes reales, alta de sucursal, límite del plan, principal única, desactivar con y sin actividad, última sucursal, permisos (mozo 403), aislamiento entre inquilinos
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-12)

- Código: `Core/Tenancy/Application/{ManageCompany, ManageBranches, BranchActivity}`, `Core/Tenancy/Presentation/{ConfigurationController, ConfigurationPresenter}`, rutas en `Core/Tenancy/Presentation/routes.php`.
- **Punto de extensión `BranchActivity`** (etiqueta `branch.activity`): `Core/Cash` (turno abierto) y `Modules/Restaurant` (pedidos abiertos) declaran su actividad, así el Core no conoce a los módulos. Cualquier módulo futuro (p. ej. inventario) puede sumarse.
- `GET /panel/resumen` suma `ruta` a cada paso del checklist.
- Pruebas: `ConfigurationTest` (8 casos). Suite completa en verde.
