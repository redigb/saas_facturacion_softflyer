# 036 — Backend

## Contrato

### Cambia: `POST /plataforma/clientes` (alta directa)

Mismo cuerpo de entrada. La respuesta deja de traer `contrasena_temporal`:

```json
// 201
{ "data": {
  "slug": "elhuarique",
  "correo": "luis@elhuarique.pe",
  "enlace_activacion": "https://elhuarique.softflyer.pe/activar?token=…",
  "expira_en": "2026-10-29T15:00:00Z"
} }
```

### Sin cambios de contrato

`POST /auth/contrasena/restablecer` (spec 035) también activa: el token de activación es un token de restablecimiento con `origen = ACTIVACION`. Errores iguales (`ENLACE_INVALIDO`, `ENLACE_VENCIDO`, …).

## Decisiones

- **Activación = restablecimiento con otro origen.** `restablecimientos_contrasena.origen` admite `ACTIVACION`. Vigencia de 72 h (`softflyer.restablecimiento.minutos_activacion`). El enlace apunta a `/activar` en vez de `/restablecer` y el correo tiene su propio texto (`ActivateAccountMail`).
- **El administrador nace con una contraseña aleatoria que nadie conoce** (64 caracteres, hasheada). Hasta activar, no puede entrar con ninguna.
- **Al usar un token `ACTIVACION` no se envía "Tu contraseña cambió"**: sería ruido justo después de crearla.
- **Todos los `Mailable` son `ShouldQueue`:** `VerifyTrialMail`, `ResetPasswordMail`, `PasswordChangedMail`, `ActivateAccountMail`.
  - `afterCommit`: si la transacción se deshace, el correo no sale.
  - `ShouldBeEncrypted`: el enlace con el token viaja cifrado con `APP_KEY` en la tabla `jobs`.
  - 3 intentos con espera de 1 y 5 minutos.
  - **Solo datos simples, nunca modelos de un inquilino.** El worker corre sin contexto RLS y no podría volver a leer un `User`. Se pasan nombre, correo, restaurante y URL.
- **Requiere el worker** (`php artisan queue:work`). En Docker ya corre. En local, sin worker los correos quedan esperando en `jobs`.

## Tareas

- [x] Migración: `ACTIVACION` en el check de `origen`
- [x] `ResetPassword`: origen de activación, ruta `/activar`, sin aviso de cambio al activar
- [x] `ManageClient::create`: contraseña aleatoria y enlace de activación; respuesta nueva
- [x] `ActivateAccountMail` (HTML + texto)
- [x] Los cuatro `Mailable` en cola, cifrados, después del commit y con datos simples
- [x] Pruebas: `assertQueued`, alta con activación, activación sin aviso de cambio
- [x] Pruebas en verde (`php artisan test`: 210) y prueba real en Docker con el worker: alta → correo cifrado en `jobs` → Mailpit → activación → login
