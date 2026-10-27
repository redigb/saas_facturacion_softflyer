# 035 — Frontend

## Para quién y dónde

- El dueño o un empleado del restaurante que olvidó su contraseña, casi siempre desde el celular y con prisa antes de abrir.
- El equipo de Softflyer atendiendo una llamada o un WhatsApp de soporte, en su laptop.

## Flujo

1. Login del restaurante → "¿Olvidaste tu contraseña?" (junto a la etiqueta Contraseña; oculto en la demo) → `/olvide`.
2. Escribe su correo → "Revisa tu correo" (mismo mensaje exista o no la cuenta).
3. El correo abre `/restablecer?token=…` → nueva contraseña dos veces → "Guardar y continuar".
4. Vuelve a `/login?restablecida=1` con el aviso "Tu contraseña nueva quedó guardada".
5. Backoffice: ficha del cliente → pestaña Usuarios → "Restablecer acceso" → diálogo de confirmación → "Enlace enviado" con el enlace y "Copiar enlace".

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Botones con texto de progreso ("Enviando…", "Guardando…"); el del backoffice con spinner |
| Vacío | `/restablecer` sin token: "Enlace incompleto" + "Pedir un enlace nuevo" |
| Error | Enlace usado o vencido: pantalla "Este enlace ya no sirve" + "Pedir un enlace nuevo". Validación junto a cada campo |
| Respuesta a cada acción | El token se gasta con un clic, nunca al cargar la página (los antivirus de correo abren los enlaces) |
| Celular | Mismo `AuthShell` del login; botones de ancho completo y 48 px |
| Teclado y accesibilidad | Foco inicial en el primer campo, `aria-invalid` y `aria-describedby` en los errores, `role="status"`/`role="alert"`, `autocomplete="new-password"` para que el gestor de contraseñas la guarde |

## Tareas

- [x] `/olvide` y `/restablecer` (públicas, solo en el subdominio de un restaurante)
- [x] Enlace en el login y aviso `restablecida=1`
- [x] Botón y diálogo "Restablecer acceso" en Usuarios del backoffice; etiqueta en la bitácora
- [x] `npm run lint` y `npx tsc --noEmit` sin errores
