# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 06 — Seguridad e IAM (Usuarios, Roles y Permisos)

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico
**Depende de:** Doc. N.° 01 (Sanctum, RLS), Doc. N.° 02 (`usuarios`, `roles`, `permisos`, `rol_usuario`, `permiso_rol`), Doc. N.° 03 (ciclo de vida del inquilino)

---

## 1. El problema que este documento resuelve primero

Antes del catálogo de permisos, hay una pregunta más básica que ningún documento anterior respondió y que **hay que resolver antes de escribir el login**: si `usuarios.correo` es único **por inquilino** (Doc. N.° 02 §3.4) y no globalmente, y el aislamiento de datos depende de que la sesión ya sepa el `inquilino_id` antes de consultar nada (RLS, Doc. N.° 02 §8) — **¿cómo se resuelve a qué inquilino pertenece un usuario que todavía no inició sesión?**

Es un problema circular: para saber el `inquilino_id` necesitas consultar `usuarios`, pero para consultar `usuarios` con RLS activo ya necesitas el `inquilino_id`. Si no se resuelve esto explícitamente, alguien terminará "resolviéndolo" con una conexión que bypasea RLS en el peor lugar posible: la pantalla de login.

### 1.1 Decisión: resolución de inquilino por subdominio

Cada inquilino tiene un `slug` único y público en la tabla `inquilinos` (columna nueva, sin RLS porque es la única tabla que debe resolverse *antes* de tener contexto de inquilino). El acceso al sistema es:

```
{slug}.softflyer.pe → ej. donjose.softflyer.pe
```

El middleware de Laravel resuelve el `inquilino_id` a partir del subdominio **antes** de tocar cualquier tabla de negocio, incluida `usuarios`, y recién entonces fija `SET app.inquilino_actual = ...` (Doc. N.° 02 §8) para todo el resto del request, incluido el propio formulario de login. Con esto, el login ya opera dentro del contexto RLS correcto y `usuarios.correo` puede seguir siendo único solo por inquilino sin ninguna consulta insegura.

### 1.2 Portal central (`login.softflyer.pe`) para quien no recuerda su subdominio

Se ofrece una pantalla alterna donde el usuario ingresa su correo sin conocer el subdominio. Esto **sí** requiere una búsqueda cruzada de inquilinos, por lo que se resuelve con una conexión de base de datos separada, de solo lectura, con un rol de PostgreSQL que **no** tiene activada la política RLS pero que solo tiene permiso `SELECT` sobre una vista mínima (`correo`, `inquilino_id`, `slug`, `nombre_empresa`) — nunca sobre `usuarios` completa ni sobre ninguna otra tabla. Si el correo aparece en más de un inquilino, se le muestra al usuario la lista de empresas para elegir; si aparece en uno solo, se le redirige directo a su subdominio. Este rol de solo lectura queda documentado como la única excepción intencional a "toda consulta pasa por RLS", y su alcance se revisa en cada auditoría de seguridad.

---

## 2. Autenticación

- **Sanctum** para el frontend Next.js propio y apps móviles propias (decisión ya fijada en Doc. N.° 01 §3.3); OAuth2 se reserva para la API pública de Fase 4, sin reemplazar Sanctum.
- **Expiración de tokens:** 8 horas de inactividad para sesiones de panel administrativo/caja; 30 días para tokens de aplicaciones móviles del mozo (con revocación remota, ver 2.2), porque exigir reautenticación cada 8 horas en un dispositivo de mozo interrumpiría el servicio en plena atención.
- **Gestión de sesiones activas:** cada usuario puede ver, desde su perfil, la lista de tokens/dispositivos activos (Sanctum permite nombrar tokens por dispositivo) y revocar cualquiera remotamente — necesario en un entorno de alta rotación de personal (mozos, cajeros) donde un dispositivo puede perderse o un empleado puede dejar de trabajar sin que alguien recuerde cerrar su sesión.
- **Bloqueo por intentos fallidos:** 5 intentos fallidos consecutivos bloquean el usuario por 15 minutos (no permanentemente, para no depender de soporte ante un simple error de tipeo reiterado), con backoff creciente si se repite el patrón.

---

## 3. Política de contraseñas

- Mínimo 10 caracteres, sin requerir combinaciones artificiales de símbolos (la evidencia de seguridad actual favorece longitud sobre complejidad forzada).
- Verificación contra contraseñas filtradas conocidas (API de *k-anonimato* tipo Have I Been Pwned, que nunca envía la contraseña completa, solo un prefijo de su hash) en el momento del registro/cambio.
- Hash con `bcrypt` (estándar de Laravel) o `argon2id` si se prioriza resistencia a hardware dedicado; se deja como parámetro de configuración, no hay necesidad de decidir uno solo de forma irreversible.
- Recuperación de contraseña: enlace de un solo uso con expiración de 60 minutos, enviado al correo registrado **dentro del contexto del inquilino ya resuelto** (sección 1.1) — el enlace de recuperación incluye el `slug` para que, aunque el usuario lo abra días después, el sistema sepa a qué inquilino pertenece sin adivinarlo.

---

## 4. Segundo factor de autenticación (MFA)

🔧 No estaba contemplado en ningún documento anterior, y es una omisión real: este sistema da acceso a certificados digitales de firma tributaria (Doc. N.° 04) y a la posibilidad de anular comprobantes. Un solo factor (contraseña) es insuficiente para los roles con ese nivel de acceso.

- **Obligatorio** para el rol `Administrador` de cada inquilino (quien puede ver/gestionar el certificado digital y las credenciales Clave SOL).
- **Opcional, recomendado** para el resto de roles.
- Mecanismo: TOTP estándar (Google Authenticator, Authy u otro compatible), sin dependencia de SMS (evita el riesgo conocido de *SIM swapping*).

---

## 5. Catálogo de permisos

Convención: `{módulo}.{acción}`, en minúsculas, coherente con el resto de la nomenclatura en español del sistema.

| Módulo | Permisos |
|---|---|
| `ventas` | `ventas.crear`, `ventas.anular`, `ventas.ver_todas` (ver ventas de otros usuarios, no solo las propias) |
| `caja` | `caja.abrir`, `caja.cerrar`, `caja.ver_movimientos`, `caja.registrar_movimiento_manual` |
| `comprobantes` | `comprobantes.emitir`, `comprobantes.anular`, `comprobantes.reenviar_sunat` |
| `inventario` | `inventario.ver`, `inventario.ajustar`, `inventario.trasladar` |
| `productos` | `productos.crear`, `productos.editar`, `productos.eliminar` |
| `clientes` | `clientes.crear`, `clientes.editar`, `clientes.ver` |
| `reportes` | `reportes.ventas`, `reportes.inventario`, `reportes.financieros` (este último separado porque expone márgenes y no todo el que ve reportes de ventas debería ver rentabilidad) |
| `usuarios` | `usuarios.crear`, `usuarios.editar`, `usuarios.asignar_rol` |
| `configuracion` | `configuracion.empresa` (datos fiscales, certificado digital — acceso más sensible del sistema), `configuracion.sucursales` |
| `restaurante` (módulo) | `restaurante.pedidos.crear`, `restaurante.pedidos.cerrar`, `restaurante.cocina.actualizar_estado`, `restaurante.mesas.gestionar` |

`configuracion.empresa` es, deliberadamente, el permiso más restringido del catálogo: solo debería asignarse al rol `Administrador`, porque de ahí se desprende el acceso al certificado digital que el propio Doc. N.° 04 §9 marcó como el dato más sensible del sistema.

---

## 6. Alcance de rol por sucursal

`rol_usuario.sucursal_id` (Doc. N.° 02 §3.4) ya permite que un mismo usuario tenga distintos roles en distintas sucursales. Se deja explícito aquí lo que eso implica en la verificación de permisos: **toda autorización valida rol + sucursal a la vez**, no solo el permiso. Un `Cajero` de la Sucursal A no debe poder cerrar caja de la Sucursal B aunque el permiso `caja.cerrar` exista en su rol, si esa asignación de rol no incluye la Sucursal B. Esto se implementa como un *Policy* de Laravel que siempre recibe el recurso (con su `sucursal_id`) y el usuario, nunca solo el nombre del permiso.

---

## 7. Auditoría específica de IAM

Sobre la tabla `bitacora_auditoria` ya definida (Doc. N.° 02 §9), se registran como eventos obligatorios (no opcionales) del módulo IAM:

- Inicio de sesión exitoso y fallido (con IP y dispositivo).
- Cambio de contraseña.
- Activación/desactivación de MFA.
- Cambio de rol o de alcance de sucursal de un usuario.
- Revocación de sesión.

Esto no es una lista decorativa: ante cualquier incidente (ej. un comprobante anulado indebidamente), la primera pregunta de una investigación es "quién tenía acceso y cuándo cambió", y sin estos eventos específicos, `bitacora_auditoria` solo respondería "qué se hizo", no "quién debería haber podido hacerlo".

---

## 8. Próximo documento

Con la resolución de inquilino por subdominio ya definida aquí, el siguiente documento del índice original, **N.° 07 — APIs y Contratos**, puede apoyarse en esto directamente: la estructura de rutas, el versionado (`/api/v1`) y el formato estándar de respuesta/error deben asumir que el middleware de resolución de inquilino ya corrió antes de llegar a cualquier controlador.

---

## Documentos pendientes según el índice original (Doc. N.° 01 §"Próximos documentos" / índice del proyecto)

| N.° | Documento | Estado |
|---|---|---|
| 00 | Visión y Objetivos del Producto | Cubierto de forma informal en la conversación inicial; no existe aún como documento formal independiente |
| 01 | Arquitectura General | ✅ Hecho (revisado) |
| 02 | Modelo de Datos Maestro | ✅ Hecho (español) |
| 03 | Arquitectura Multi-Tenant y Aprovisionamiento | ✅ Hecho |
| 04 | Facturación Electrónica (SUNAT) | ✅ Hecho (con Greenter) |
| 05 | Módulo Restaurante | ✅ Hecho |
| 06 | Seguridad e IAM | ✅ Hecho (este documento) |
| 07 | APIs y Contratos | **Pendiente** — rutas REST, versionado, formato estándar de request/response y de errores, paginación, convención de nombres de endpoints en español o inglés (a decidir) |
| 08 | Infraestructura y DevOps | **Pendiente** — Dockerfiles, pipeline de GitHub Actions, entornos (ya esbozado en Doc. 01 §15, falta el detalle operativo), backups de PostgreSQL, estrategia de despliegue |
| 09 | Estándares de Desarrollo | **Parcialmente cubierto** en Doc. 01 §17; podría quedar como está o expandirse con ejemplos de código y convenciones de PR/commits |
| 10 | Roadmap del Producto | **Parcialmente cubierto** en Doc. 01 §16 y Doc. 03; podría consolidarse en un documento único con fechas/hitos si se necesita para levantar inversión o planificar contrataciones |

Si quieres, seguimos con el **N.° 07 (APIs y Contratos)**, que es el que falta por completo y es el más directamente ligado a lo que viene: empezar a escribir controladores.
