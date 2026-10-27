# 036 — Activación de cuenta y correos en cola

**Estado:** Cerrada (2026-10-26)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** — (soporte y seguridad)
**Documentos:** Doc. 06 §3 · Doc. 10 §1 y §2 · spec 035

## Qué y por qué

1. **Alta de cliente sin contraseña temporal.** Hoy el backoffice crea al cliente y le muestra al equipo una contraseña temporal para dictársela. Eso contradice la regla de la spec 035: nadie de Softflyer debe conocer la contraseña del cliente. Ahora el alta envía un correo **"Activa tu cuenta"** con un enlace de un solo uso, y el dueño crea su propia contraseña.
2. **Correos por la cola.** Hoy cada correo se envía dentro de la petición: si el proveedor tarda o se cae, el login, el registro o el backoffice esperan o fallan. Ahora se encolan y los envía el worker, con reintentos.
3. **Proveedor real.** Queda listo para conectarse cambiando solo el `.env` (Doc. 10 §1.3). Se activa cuando exista el dominio; esta spec no lo configura.

## Criterios de aceptación

- [x] Al crear un cliente, el backoffice muestra la dirección, el correo y el **enlace de activación** (con "Copiar" para WhatsApp); nunca una contraseña.
- [x] El dueño recibe "Activa tu cuenta de {restaurante}"; el enlace abre `{slug}.dominio/activar`, vence en 72 h y sirve una vez.
- [x] Al activar, entra al login con el aviso "Tu cuenta está lista" y **no** recibe el correo "Tu contraseña cambió".
- [x] Si el enlace venció, soporte usa "Restablecer acceso" (spec 035) para enviar otro.
- [x] Ningún correo se envía dentro de la petición; todos pasan por la cola, se reintentan si el proveedor falla y no salen si la transacción que los originó se deshace.
- [x] El enlace con el token no queda legible en la tabla `jobs` (carga cifrada).

## Fuera de alcance

- Configurar Resend/Brevo y los registros DNS (requiere el dominio; Doc. 10 §1.3).
- Webhooks de rebotes y quejas del proveedor.
- Cambiar la prueba gratis: ahí el dueño ya elige su contraseña al registrarse.
