# 004 — Frontend

Sigue el skill `front-next/.agents/skills/softflyer-ui` y la biblioteca `@/components/ui` (el pulido visual lo hace el agente de diseño).

## Para quién y dónde

- **Equipo:** el dueño, en su laptop o tablet, cuando entra alguien nuevo o alguien se va. Pocas veces, pero tiene que ser obvio.
- **Cambio de usuario con PIN:** el mozo, con la tablet compartida en la mano, en pleno servicio. Tiene que tomar dos segundos y funcionar con el dedo.

## Flujo

**Equipo** (`/panel/equipo`):
1. Lista del equipo: iniciales, nombre, correo, rol, "PIN ✓", último acceso e interruptor de activo.
2. **Agregar persona** (panel lateral): nombre, correo, contraseña (con botón "Generar" y "Mostrar"), rol elegido en tarjetas con su descripción ("Mozo: atiende mesas y toma pedidos") y PIN opcional.
3. Al guardar, una tarjeta resume los datos de acceso para pasárselos a la persona (correo, contraseña y PIN), con botón **Copiar**. Es la única vez que se ven.
4. **Editar**: cambiar nombre, correo, rol; restablecer contraseña; poner o quitar PIN.
5. **Desactivar** desde el interruptor: pide confirmación ("Rosa ya no podrá entrar; sus sesiones se cierran ahora").

**Cambiar de usuario** (en la cabecera del panel, para todos):
1. Botón "Cambiar usuario" → cuadrícula grande con las personas que tienen PIN.
2. Toca su nombre → teclado numérico grande (botones de 56px) → al 4.º–6.º dígito confirma.
3. Entra a su panel; la sesión anterior se cerró.

**Panel por rol:**
- El menú muestra solo lo que el rol puede usar: Inicio (`panel.ver`), Plano (`restaurante.plano.editar`), Carta (`productos.*`), Equipo (`usuarios.editar`).
- Quien no tiene `panel.ver` entra directo a su primera sección disponible; si su rol todavía no tiene pantalla (Mozo y Cocinero hasta H1), ve un mensaje amable y el botón "Cambiar usuario".

## Experiencia

| Tema | Decisión |
|---|---|
| Cargando | Esqueleto de la lista |
| Vacío | Solo está el dueño: tarjeta que invita a "Agregar a tu primer mozo" |
| Contraseña | Generada legible (sin 0/O, 1/l); nunca se vuelve a mostrar después del resumen |
| Errores | `detalles` bajo cada campo; 409 del último admin / uno mismo como aviso claro |
| Desactivar | Optimista con reversión si falla; confirmación previa |
| Teclado PIN | Botones 56px, dígitos ocultos como puntos, borrar, puntos en rojo al fallar (la animación de sacudida queda para el agente de diseño), mensaje de bloqueo con minutos |
| Celular | Lista en tarjetas; panel lateral a pantalla completa |
| Accesibilidad | Teclado PIN también acepta el teclado físico; etiquetas en todos los campos |

## Tareas

- [x] Esquemas Zod del contrato (usuario, rol, cambio, sesión por PIN)
- [x] Consultas y mutaciones: equipo, roles, alta, edición, activo (optimista), PIN
- [x] Página Equipo: lista, vacío, agregar, editar, resumen de acceso con copiar
- [x] Menú filtrado por permisos y acceso al panel para todos los roles
- [x] "Cambiar usuario": selector y teclado PIN; acción de servidor que guarda la nueva sesión en la cookie httpOnly
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin errores

## Cierre (2026-10-08)

- Código: `src/app/panel/equipo/*`, `src/app/panel/switch-user.tsx`, acción `switchUser` en `src/app/panel/actions.ts`, `src/lib/schemas/equipo.ts`; menú por permisos en `navigation.ts` (`visibleNavigation`, `firstAllowedHref`), usado por `panel-shell.tsx`, `layout.tsx` e Inicio.
- **Corrección de seguridad del proxy (spec 002):** `/api/auth/*` (salvo `auth/yo`) ya no pasa por el proxy. Login y PIN devuelven tokens: solo los manejan acciones de servidor que los guardan en la cookie httpOnly; antes el JavaScript del navegador podía leerlos.
- Verificado: `tsc`, `npm run lint` completo y `check_ui.py` sin errores. Contra los servidores reales: alta de un mozo con PIN, lista del equipo, `/equipo/cambio`, el proxy bloquea `auth/pin` y `auth/login` (404), PIN incorrecto → 401, PIN correcto → nueva sesión y la anterior revocada (401), el mozo ve "Tu vista llega pronto" con "Cambiar usuario"; `/panel/equipo` y `/panel` responden 200. Datos de prueba borrados.
- Pulido visual: delegado al agente de diseño (el botón mostrar/ocultar contraseña usa íconos provisionales).
