# 035 — Restablecer contraseña

**Estado:** Cerrada (2026-10-26)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** — (soporte y seguridad)
**Documentos:** Doc. 06 §1.1, §3 y §7 · Doc. 10 §1

## Qué y por qué

Un cliente creado desde el backoffice recibía una contraseña temporal que se mostraba una sola vez; si se perdía, no había forma de recuperar el acceso. Tampoco existía "¿Olvidaste tu contraseña?".

Ahora el acceso se recupera con un **enlace de un solo uso** que abre el subdominio del restaurante. Lo pide el propio usuario desde el login, o lo envía soporte desde el backoffice. Nadie, ni el equipo de Softflyer, llega a conocer la contraseña.

## Criterios de aceptación

- [x] Desde el login del restaurante, "¿Olvidaste tu contraseña?" envía un enlace al correo; la respuesta es la misma exista o no la cuenta.
- [x] El enlace abre `{slug}.dominio/restablecer`, vence (60 min si lo pidió el usuario, 24 h si lo envió soporte) y sirve una sola vez.
- [x] Pedir un enlace nuevo invalida el anterior.
- [x] Al guardar la contraseña nueva se cierran todas las sesiones, se desbloquea el login si estaba bloqueado por intentos y llega un correo "Tu contraseña cambió".
- [x] En el backoffice, ficha del cliente → Usuarios → "Restablecer acceso" envía el enlace y lo muestra para copiarlo (WhatsApp). Queda en la bitácora como `ACCESO_RESTABLECIDO`.
- [x] Un token de un restaurante no funciona en otro subdominio; soporte no puede restablecer a un usuario de otro cliente.
- [x] Usuarios inactivos y clientes cancelados no reciben enlace.

## Fuera de alcance

- Reemplazar la contraseña temporal del alta de cliente por un enlace "Activa tu cuenta": hecho en la spec 036.
- "Mi perfil → Cambiar contraseña" pidiendo la actual (spec 013).
- Verificación contra contraseñas filtradas (Doc. 06 §3, `Password::uncompromised()`), MFA del Administrador (Doc. 06 §4) y bitácora IAM del lado del restaurante (Doc. 06 §7: todavía no existe la tabla).
- Envío por cola: hecho en la spec 036. Proveedor de correo real: ver Doc. 10 §1.
