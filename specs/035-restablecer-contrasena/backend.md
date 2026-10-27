# 035 — Backend

## Contrato

Base `/api/v1`. Errores con el formato del Doc. 07 §3.3.

### Restaurante (subdominio del inquilino, sin sesión)

| Método | Ruta | Límite | Respuesta |
|---|---|---|---|
| POST | `/auth/contrasena/olvide` | `throttle:restablecer` (5/min por host e IP) + 3 envíos por correo cada 15 min | 202 |
| POST | `/auth/contrasena/restablecer` | `throttle:restablecer` | 200 |

```json
// POST /auth/contrasena/olvide
{ "correo": "admin@donjose.pe" }
// 202, siempre igual (no revela si la cuenta existe)
{ "data": { "mensaje": "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña." } }

// POST /auth/contrasena/restablecer
{ "token": "<64 caracteres>", "contrasena": "nueva-clave-segura", "contrasena_confirmation": "nueva-clave-segura" }
// 200
{ "data": { "correo": "admin@donjose.pe" } }
```

### Backoffice (`admin.{dominio}`, guard `plataforma`)

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/plataforma/clientes/{slug}/usuarios/{id}/restablecer-acceso` | 200 |

```json
{ "data": { "correo": "admin@donjose.pe", "enlace": "https://donjose.softflyer.pe/restablecer?token=…", "expira_en": "2026-10-27T15:00:00Z" } }
```

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 404 | `ENLACE_INVALIDO` | El token no existe, ya se usó, fue reemplazado o es de otro restaurante |
| 410 | `ENLACE_VENCIDO` | El token venció |
| 403 | `USUARIO_INACTIVO` | El usuario fue desactivado después de pedir el enlace |
| 403 | `INQUILINO_CANCELADO` | El restaurante está cancelado |
| 422 | `VALIDACION` | Contraseña de menos de 10 caracteres o confirmación distinta |
| 404 | `USUARIO_NO_ENCONTRADO` | (backoffice) el usuario no pertenece a ese cliente |
| 409 | `USUARIO_INACTIVO` / `CLIENTE_CANCELADO` | (backoffice) no tiene sentido enviar el enlace |

## Decisiones

- **Tabla `restablecimientos_contrasena` con RLS**: se guarda solo `token_hash` (SHA-256), igual que la verificación de la prueba. El endpoint público ya corre dentro del inquilino del subdominio, así que el token se busca bajo RLS y no hace falta saltarse el aislamiento (Doc. 06 §1.1).
- **Vigencia por origen:** `USUARIO` 60 min (Doc. 06 §3); `PLATAFORMA` 24 h, porque soporte suele mandarlo por WhatsApp y el cliente no siempre lo abre al instante (`config/softflyer.php → restablecimiento`).
- **El backoffice ve el enlace, nunca la contraseña.** Queda constancia en `bitacora_plataforma` (`ACCESO_RESTABLECIDO`).
- **Limitador propio `restablecer`:** `throttle:N,1` comparte la cubeta con el login (misma firma de dominio e IP), y tras 5 intentos fallidos bloqueaba justo "Olvidé mi contraseña".
- Restablecer limpia el bloqueo por intentos del login: quien abrió el enlace demostró ser dueño del correo.
- Los correos se envían en línea, como `VerifyTrialMail`. Pasarlos a la cola junto con todos los demás (Doc. 10 §1.5).

## Tareas

- [x] Migración, modelo `PasswordReset` y caso de uso `Core/Iam/Application/ResetPassword`
- [x] Correos `ResetPasswordMail` y `PasswordChangedMail` (HTML + texto)
- [x] Endpoints del restaurante y del backoffice; acción nueva en la bitácora
- [x] Pruebas: `tests/Feature/Iam/PasswordResetTest.php` y dos casos en `PlatformTest`
- [x] Pruebas en verde (`php artisan test`: 205)
