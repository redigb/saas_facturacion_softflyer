# 004 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Middleware `inquilino`, `auth:sanctum`, `cuenta.vigente`. Errores con el formato del Doc. 07 §3.3; usuario de otro inquilino → 404.

| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/roles` | autenticado | 200 los roles del restaurante con sus permisos |
| GET | `/usuarios` | `usuarios.editar` | 200 lista del equipo |
| POST | `/usuarios` | `usuarios.crear` | 201 usuario |
| PATCH | `/usuarios/{id}` | `usuarios.editar` (+ `usuarios.asignar_rol` si cambia `rol_ids`) | 200 usuario |
| PUT | `/usuarios/{id}/pin` | `usuarios.editar` | 204 — `{ "pin": "4821" }` |
| DELETE | `/usuarios/{id}/pin` | `usuarios.editar` | 204 |
| GET | `/equipo/cambio` | autenticado | 200 quiénes pueden entrar con PIN en este dispositivo |
| POST | `/auth/pin` | autenticado | 200 nueva sesión — `{ "usuario_id": 7, "pin": "4821", "dispositivo": "Tablet salón" }` |

### Usuario

```json
{
  "data": {
    "id": 7,
    "nombre": "Rosa Quispe",
    "correo": "rosa@donjose.pe",
    "es_activo": true,
    "tiene_pin": true,
    "roles": [{ "id": 4, "nombre": "Mozo" }],
    "ultimo_acceso": "2026-10-08T14:22:05Z",
    "es_yo": false
  }
}
```

- `ultimo_acceso`: el uso más reciente de cualquiera de sus sesiones (nulo si nunca entró).
- El PIN y la contraseña nunca se devuelven.

### Alta y edición

| Campo | POST | PATCH | Regla |
|---|---|---|---|
| `nombre` | requerido | opcional | ≤ 120 |
| `correo` | requerido | opcional | correo válido, único en el restaurante (sin distinguir mayúsculas) |
| `contrasena` | requerida | opcional (restablecer) | ≥ 10 caracteres (Doc. 06 §3) |
| `rol_ids` | requerido | opcional | 1 o más roles de este restaurante |
| `pin` | opcional | — | 4–6 dígitos (se cambia con `PUT /pin`) |
| `es_activo` | — | opcional | booleano |

- Desactivar a un usuario o restablecer su contraseña **revoca todas sus sesiones**.
- Los roles se asignan a todas las sucursales (`rol_usuario.sucursal_id` nulo).

### Roles

```json
{ "data": [ { "id": 4, "nombre": "Mozo", "descripcion": "Atiende mesas y toma pedidos", "es_sistema": true, "permisos": ["clientes.ver", "restaurante.pedidos.crear"] } ] }
```

### Cambio rápido con PIN

`GET /equipo/cambio` → `{ "data": [ { "id": 7, "nombre": "Rosa Quispe", "roles": ["Mozo"] } ] }`: usuarios activos con PIN.

`POST /auth/pin` exige **una sesión válida del mismo restaurante** en el dispositivo (el PIN solo no abre la puerta desde internet). Si el PIN es correcto:
- crea una sesión nueva para `usuario_id` y la devuelve con el mismo formato que `POST /auth/login` (`token`, `tipo_token`, `expira_en`, `usuario`, `inquilino`);
- **revoca la sesión que hizo la llamada** (en una tablet compartida no quedan sesiones colgadas).

Bloqueo: 5 PIN incorrectos para un mismo usuario lo bloquean 15 minutos (como el login, Doc. 06 §2).

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `VALIDACION` | Campos inválidos, correo repetido, PIN que no son 4–6 dígitos, rol de otro restaurante |
| 429 | `LIMITE_PLAN_ALCANZADO` | Crear o reactivar a alguien superaría `planes.max_usuarios` del plan vigente (Doc. 03 §5) |
| 409 | `ULTIMO_ADMINISTRADOR` | Se desactivaría o quitaría el rol al último Administrador activo |
| 409 | `ACCION_SOBRE_SI_MISMO` | Desactivarse o quitarse el rol de Administrador a uno mismo |
| 401 | `PIN_INVALIDO` | PIN incorrecto, usuario sin PIN o inactivo (no se distingue cuál) |
| 429 | `BLOQUEO_POR_INTENTOS` | Demasiados PIN incorrectos |

## Decisiones

- **El PIN no es una credencial de entrada**: solo cambia de usuario en un dispositivo ya autenticado. 4 dígitos son 10 000 combinaciones; expuesto a internet sin sesión sería atacable.
- El PIN se guarda con el mismo hash que la contraseña (Doc. 08 §4).
- Usuarios no se borran: se desactivan (tendrán ventas y pedidos a su nombre).
- `PATCH` con `rol_ids` exige además `usuarios.asignar_rol` (Doc. 06 §5 separa editar de asignar rol).
- Límite de usuarios: se compara el número de usuarios activos con `max_usuarios` del plan vigente y se actualiza `uso_inquilino.usuarios_activos` del mes. Se cuenta en vivo (no solo con el contador) porque los usuarios activos son un estado, no un consumo mensual; el contador queda para reportes.

## Tareas

- [x] Casos de uso: alta, edición (roles, activo, contraseña), PIN, protecciones del último administrador y de uno mismo
- [x] Revocar sesiones al desactivar o restablecer contraseña
- [x] `GET /roles`, `GET /usuarios` con roles y último acceso
- [x] `GET /equipo/cambio` y `POST /auth/pin` (sesión previa obligatoria, bloqueo por intentos, revoca la sesión anterior)
- [x] Pruebas: alta y login del nuevo usuario, correo repetido, permisos (mozo no gestiona), último admin, uno mismo, desactivar revoca, PIN correcto/incorrecto/bloqueo, PIN sin sesión → 401, PIN de otro inquilino → 401, 404 entre inquilinos
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-08)

- Código: `Core/Iam/Application/{ManageTeam, SwitchUserWithPin}`, `Presentation/Controllers/TeamController`, `Presentation/Requests/TeamMemberRequest`, `AuthController::pin`.
- Pruebas: `tests/Feature/Iam/TeamTest.php` (11 casos). Suite: 84 en verde como `softflyer_app`.
