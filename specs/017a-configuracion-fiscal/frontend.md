# 017a — Frontend

## Para quién y dónde

- **Dueño o gerente:** pestaña **Facturación** dentro de Configuración (`/panel/configuracion`), visible con el permiso `configuracion.empresa`. Se usa una vez al configurar y cuando vence el certificado.
- **Equipo de la plataforma:** ficha del cliente en el backoffice (`/plataforma/clientes/[slug]`).

## Flujo del panel

1. Arriba, el resumen: **Lista para emitir** o **Falta configurar**, y el entorno (**Pruebas (beta)** o **Producción**). Mientras no esté homologada se avisa que los comprobantes no tienen validez tributaria.
2. **Certificado digital:** archivo `.pfx`/`.p12` y contraseña. Muestra titular y vencimiento; en amarillo si faltan 30 días o menos, en rojo si venció.
3. **Usuario SOL:** usuario y clave. La clave nunca se muestra; si ya hay una, se escribe solo para cambiarla.
4. **Tasa de IGV:** selector con las tasas vigentes (hoy solo la general, 18 %).
5. **IGV por local:** un interruptor por sucursal; se apaga solo en zonas exoneradas.
6. **Afectación al IGV por producto:** lista de la carta con buscador y un selector por producto (gravado por defecto, exonerado, inafecto). Cambia al elegir.

Si Softflyer bloqueó la configuración, la pestaña muestra el resumen y un aviso en solo lectura, sin formularios.

## Flujo del backoffice

- La ficha del cliente suma el bloque **Facturación electrónica** (estado, entorno, certificado, usuario SOL, tasa, homologación) sin secretos.
- Tarjeta **Homologación en SUNAT**: marcar o retirar, con registro en la bitácora.
- Tarjeta **Bloqueo de configuración fiscal**: bloquear cuando la facturación del cliente esté lista; desbloquear para cambiarla.

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueletos; nunca pantalla en blanco |
| Certificado inválido o vencido | El mensaje de la API sale junto al campo del archivo; no se pierde lo demás |
| Secretos | Ni la clave SOL ni el certificado vuelven al navegador; la contraseña se borra al guardar |
| Subida del archivo | `multipart` a través del proxy `/api`, que ahora reenvía el cuerpo como bytes |
| Guardado | Aviso breve y el resumen se actualiza con la respuesta |
| Celular | Una columna; los selectores ocupan todo el ancho |

## Tareas

- [x] Soporte de `FormData` en `lib/browser-api.ts` y cuerpo binario en el proxy `app/api/[...path]/route.ts`
- [x] Pestaña **Facturación**: `fiscal-tab.tsx`, `afectacion-section.tsx`, `fiscal-queries.ts`, `lib/schemas/facturacion.ts`
- [x] Backoffice: bloque fiscal y tarjeta de homologación
- [x] `igv-por-local-section.tsx`, vista de solo lectura con bloqueo y tarjeta de bloqueo en el backoffice
- [x] El certificado acepta PEM además de PFX (texto de ayuda actualizado)
- [x] Backoffice: tarjetas Certificado digital, Usuario y clave SOL e IGV por local (`apiFetch` ya envía archivos)
- [x] `npx tsc --noEmit`, `eslint` y `check_ui.py` sin avisos

### Verificación manual (2026-10-19: el dueño del producto confirmó que todo funciona; los pasos 10 y 11 son de lo añadido después)

1. Entrar como administrador a **Configuración → Facturación**: el resumen dice "Falta configurar".
2. Subir un `.pfx` con la contraseña equivocada: el error sale junto al archivo.
3. Subir un `.pfx` válido: aparecen titular y vencimiento.
4. Guardar usuario y clave SOL, volver a abrir la pestaña: la clave no se ve, dice "Clave guardada".
5. Con RUC válido, certificado y SOL: el resumen pasa a "Lista para emitir".
6. Cambiar un producto a "Exonerado" y recargar: se conserva.
7. Apagar "opera con IGV" en un local y recargar: se conserva.
8. En el backoffice, bloquear la configuración fiscal del cliente; en su panel la pestaña queda en solo lectura y los PUT responden 403.
9. En el backoffice, abrir el cliente: se ve el bloque fiscal; marcar homologación y ver la entrada en la bitácora.
10. En el backoffice, con el cliente bloqueado, cargar un certificado `.pem` y el usuario y clave SOL: la ficha los refleja y la bitácora lo anota.
11. Quitar el IGV a un local desde el backoffice y comprobar que el panel del dueño lo muestra sin poder cambiarlo.
