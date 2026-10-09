# 004 — Equipo: usuarios, roles y PIN

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H0 (Doc. 09 §2)
**Documentos:** Doc. 06 §2-3 y §5 (autenticación, contraseñas, permisos), Doc. 08 §4 (IAM restaurante, `pin_hash`)

## Qué y por qué

Hoy cada restaurante tiene un solo usuario: el Administrador que se creó al darse de alta. Los 5 roles existen (Administrador, Cajero, Encargado de salón, Mozo, Cocinero), pero no hay cómo crear a los mozos ni a la cocina. Además el panel solo deja entrar a quien tiene `panel.ver`, así que un Encargado de salón no puede llegar al plano aunque tenga permiso para editarlo.

Esta spec le da al dueño la pantalla **Equipo** para dar de alta a su personal, asignarle un rol y un PIN, y abre el panel a cada rol según lo que puede hacer. El PIN permite que varios mozos compartan una tablet y cambien de usuario en dos segundos, sin escribir correo y contraseña en pleno servicio.

## Criterios de aceptación

- [x] El dueño ve a todo su equipo con su rol, si tiene PIN, si está activo y cuándo entró por última vez.
- [x] Da de alta a una persona con nombre, correo, contraseña y rol en menos de un minuto.
- [x] Cambia el rol, desactiva (no borra) a alguien que dejó de trabajar y le restablece la contraseña.
- [x] Al desactivar a alguien, sus sesiones abiertas dejan de funcionar al instante.
- [x] Asigna o quita un PIN de 4 a 6 dígitos.
- [x] En un dispositivo con sesión abierta, otra persona del equipo cambia de usuario eligiendo su nombre y tecleando su PIN; la sesión anterior se cierra.
- [x] El restaurante nunca se queda sin un Administrador activo, y nadie se puede desactivar ni quitar el rol a sí mismo.
- [x] Cada persona entra al panel y ve solo las secciones que su rol puede usar.

## Fuera de alcance

- Invitar por correo para que cada persona elija su contraseña (se agrega con el envío de correos transaccionales).
- Roles personalizados y editar permisos de un rol: se usan las 5 plantillas.
- Roles por sucursal en la interfaz (la API asigna a todas las sucursales, `sucursal_id` nulo).
- Bitácora de cambios de rol (Doc. 06 §7): la tabla `bitacora_auditoria` es del lote 10; queda anotado.
- MFA del Administrador (Doc. 06 §4): spec propia.
