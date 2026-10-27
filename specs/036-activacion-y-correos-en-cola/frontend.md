# 036 — Frontend

## Para quién y dónde

- El equipo de Softflyer cerrando una venta: crea al cliente desde el backoffice y le pasa el acceso al momento (WhatsApp o correo).
- El dueño del restaurante abriendo el correo de bienvenida, casi siempre desde el celular.

## Flujo

1. Backoffice → "Nuevo cliente" → completa el formulario → "Cliente creado".
2. La pantalla de éxito muestra la dirección web, el correo y el enlace de activación con su vencimiento, más "Copiar mensaje de bienvenida", que arma el texto para WhatsApp. **Ya no muestra contraseña.**
3. El dueño abre `/activar?token=…`: "Activa tu cuenta" → crea su contraseña dos veces → "Activar mi cuenta".
4. Llega a `/login?activada=1` con "¡Tu cuenta está lista! Ingresa con la contraseña que acabas de crear."

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Igual que en la spec 035 (texto de progreso en el botón) |
| Vacío | `/activar` sin token: "Enlace incompleto" y pedir a Softflyer uno nuevo |
| Error | Enlace vencido o usado: "Este enlace ya no sirve. Pide a Softflyer que te envíe uno nuevo." (no ofrece "Olvidé mi contraseña": quien activa aún no tiene una) |
| Respuesta a cada acción | El token se gasta con un clic, nunca al cargar la página |
| Celular | Mismo `AuthShell` del login |
| Teclado y accesibilidad | Igual que en la spec 035 |

## Tareas

- [x] Pantalla de éxito del alta (diálogo y página `/clientes/nuevo`) con enlace en vez de contraseña
- [x] `/activar` reutilizando el formulario de la spec 035 con su propio texto
- [x] Aviso `activada=1` en el login
- [x] `npm run lint` y `npx tsc --noEmit` sin errores
