# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 03 — Arquitectura Multi-Tenant y Aprovisionamiento

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico
**Depende de:** Documento N.° 01 (RLS, envío asíncrono SUNAT) y Documento N.° 02 (modelo de datos en español: `inquilinos`, `empresas`, `sucursales`, etc.)

---

## 1. Objetivo de este documento

El Documento N.° 02 definió **cómo se aísla** un inquilino a nivel de base de datos (RLS). Este documento define algo distinto y igual de importante: **qué pasa con un inquilino a lo largo del tiempo** — cómo nace, cómo se le cobra, qué ocurre si no paga, y qué ocurre si se va — porque ninguna de estas preguntas se resuelve con una tabla, sino con un proceso bien definido. Un modelo de datos correcto sin un ciclo de vida claro igual termina en inconsistencias operativas (por ejemplo: ¿se puede seguir emitiendo comprobantes si el inquilino no pagó su suscripción del SaaS?).

---

## 2. Ciclo de vida del inquilino

🔧 Esto no puede quedar implícito: define directamente qué le pasa a un restaurante real la mañana en que su tarjeta de pago falla.

```
PRUEBA → ACTIVO → MOROSO → SUSPENDIDO → CANCELADO
              ↑________________|
           (regulariza el pago)
```

| Estado | Significado | Puede emitir comprobantes | Puede acceder al sistema |
|---|---|---|---|
| `PRUEBA` | Periodo de evaluación, sin pago aún | Sí, con límites del plan de prueba | Sí, completo |
| `ACTIVO` | Suscripción vigente y pagada | Sí | Sí, completo |
| `MOROSO` | Pago vencido, dentro del periodo de gracia | Sí (no se corta operación por una factura SaaS atrasada) | Sí, con aviso visible de pago pendiente |
| `SUSPENDIDO` | Mora superó el periodo de gracia | **No** puede emitir comprobantes nuevos | Solo lectura: puede ver histórico, exportar datos, regularizar pago |
| `CANCELADO` | El inquilino terminó la relación comercial | No | No; solo un canal de exportación de datos por tiempo limitado (sección 6) |

🔧 **Decisión clave que el documento anterior no cubría:** un inquilino `MOROSO` **sigue operando con normalidad**. La razón es que Softflyer es un sistema de facturación tributaria: cortar la emisión de comprobantes de un restaurante porque se atrasó tres días en pagar su suscripción SaaS generaría un daño desproporcionado (el restaurante no podría vender legalmente) frente al problema real (una cobranza pendiente). El corte solo ocurre en `SUSPENDIDO`, después de un periodo de gracia explícito (propuesta: 15 días corridos desde el vencimiento), y aun así se preserva el acceso de solo lectura, porque los datos ya emitidos le pertenecen al cliente y tienen valor legal ante SUNAT independientemente de si pagó o no el SaaS.

---

## 3. Modelo de datos de soporte (planes y suscripciones)

Se agregan al modelo del Documento N.° 02, siguiendo la misma convención en español.

### 3.1 `planes`
| Columna | Tipo | Notas |
|---|---|---|
| id | BIGINT PK | |
| nombre | VARCHAR | `Prueba`, `Básico`, `Profesional`, `Ilimitado` |
| precio_mensual | DECIMAL(12,2) | |
| max_sucursales | INT nullable | `NULL` = sin límite |
| max_usuarios | INT nullable | |
| max_comprobantes_mes | INT nullable | Límite operativo, no legal |
| modulos_incluidos | JSONB | Ej. `["restaurante"]` — controla qué módulo(s) puede activar el inquilino |

### 3.2 `suscripciones`
| Columna | Tipo | Notas |
|---|---|---|
| id | BIGINT PK | |
| inquilino_id | BIGINT FK | |
| plan_id | BIGINT FK | |
| estado | VARCHAR | `PRUEBA`, `ACTIVA`, `MOROSA`, `SUSPENDIDA`, `CANCELADA` — refleja el estado del inquilino (sección 2), pero vive aquí porque un inquilino puede cambiar de plan sin cambiar de estado |
| fecha_inicio | DATE | |
| fecha_vencimiento | DATE | Próxima fecha de cobro |
| dias_gracia | INT | Configurable por plan; default 15 |
| fecha_suspension_programada | DATE nullable | Calculada como `fecha_vencimiento + dias_gracia` |

🔧 Se separa `suscripciones` de `inquilinos` (en vez de poner el estado directo en `inquilinos`) porque así queda historial: si un inquilino cambia de plan o se suspende y reactiva varias veces, cada `suscripcion` es un registro, no un valor que se sobrescribe y pierde trazabilidad — algo que además es útil para soporte al cliente y para cobranza.

### 3.3 `uso_inquilino` (contadores para límites de plan)
| Columna | Tipo | Notas |
|---|---|---|
| inquilino_id | BIGINT FK | |
| periodo | VARCHAR | `2026-07` (año-mes) |
| comprobantes_emitidos | INT | Se incrementa por evento, no se calcula con `COUNT()` en cada request, por rendimiento |
| sucursales_activas | INT | |
| usuarios_activos | INT | |

Esta tabla es la que responde, sin escanear `comprobantes` cada vez, si un inquilino llegó al límite de su plan.

---

## 4. Alta de un inquilino (aprovisionamiento)

🔧 Esto tampoco estaba definido: "crear un inquilino" no es un solo `INSERT`, es una secuencia con dependencias, y si un paso falla a la mitad, el inquilino queda en un estado inconsistente (por ejemplo, con empresa pero sin roles, y el primer usuario no puede hacer nada).

Secuencia obligatoria, ejecutada dentro de una **transacción de base de datos** (si algo falla, se revierte todo, no queda un inquilino "a medias"):

1. Crear `inquilinos` (estado `PRUEBA`).
2. Crear `suscripciones` con el plan de prueba y `fecha_vencimiento` = hoy + N días.
3. Crear la política RLS ya existe a nivel de esquema (no se crea por inquilino; ver Doc. 02 §8 — la política aplica a todos los inquilinos por igual, lo que cambia es el valor de `inquilino_id`).
4. Crear `empresas` (la razón social ingresada en el registro).
5. Crear `sucursales` (la sucursal principal, `es_principal = true`).
6. Clonar los `roles` de plantilla del sistema (`inquilino_id IS NULL`) hacia roles propios del inquilino, con sus `permiso_rol` correspondientes.
7. Crear el primer `usuario` (quien se registró) con rol `Administrador`.
8. Crear el `almacen` principal de la sucursal.
9. Crear la `caja` principal de la sucursal.
10. Inicializar `uso_inquilino` para el periodo actual en cero.

Si el aprovisionamiento se dispara desde un job en cola (recomendado, para no bloquear el registro esperando 10 pasos), el usuario ve un estado "Preparando tu cuenta…" hasta que el job termine, en vez de un formulario que tarda varios segundos en responder.

---

## 5. Aplicación de límites de plan

Antes de una operación que consume cupo (crear sucursal, crear usuario, emitir comprobante), el backend valida contra `uso_inquilino` y `planes`, no contra un `COUNT()` en vivo:

```
si uso_inquilino.comprobantes_emitidos >= planes.max_comprobantes_mes:
    rechazar con mensaje claro ("Alcanzaste el límite de tu plan, actualiza para continuar")
```

🔧 Un punto que se debe decidir explícitamente: **los límites de plan nunca bloquean anular o consultar comprobantes ya emitidos**, solo bloquean *nuevas* emisiones. Igual que con la suspensión por mora, la razón es que el historial tributario no puede quedar inaccesible por una condición comercial del SaaS.

---

## 6. Suspensión, reactivación y cancelación

### 6.1 Paso a `MOROSO`
Job diario que revisa `suscripciones.fecha_vencimiento < hoy` y no tiene un pago registrado; cambia el estado a `MOROSO` y notifica al inquilino (correo + aviso en el sistema).

### 6.2 Paso a `SUSPENDIDO`
Job diario que revisa `fecha_suspension_programada <= hoy` en estado `MOROSO`; cambia a `SUSPENDIDO`. A partir de aquí:
- Se bloquea la creación de nuevos comprobantes, ventas y pedidos (middleware que verifica el estado del inquilino antes de cualquier operación de escritura).
- Se mantiene el acceso de solo lectura y la posibilidad de exportar datos y de pagar para reactivar.

### 6.3 Reactivación
Al registrar el pago, el job de cobranza actualiza `suscripciones.estado` a `ACTIVA`, recalcula `fecha_vencimiento` y `fecha_suspension_programada`, y el inquilino recupera acceso de escritura de inmediato — no requiere intervención manual.

### 6.4 Cancelación (`CANCELADO`) y retención de datos

🔧 **Este es el punto más delicado y el que más fácil se pasa por alto:** los comprobantes electrónicos son documentos tributarios; en Perú, la obligación de conservación de documentación contable es de varios años. Aunque el cliente cancele su cuenta en Softflyer, sus comprobantes emitidos no pueden borrarse de inmediato.

Política propuesta:
1. Al cancelar, el inquilino pasa a `CANCELADO` y pierde todo acceso operativo (ya no puede vender ni emitir).
2. Se habilita, por un periodo definido (propuesta: 90 días), un **canal de exportación** (descarga de XML, CDR y PDF de todos sus comprobantes, y un export de sus datos maestros en CSV/JSON) al que el cliente accede con sus credenciales aunque su cuenta esté cancelada.
3. Pasado ese periodo, los datos operativos (mesas, pedidos, sesiones de caja) pueden purgarse, pero los **comprobantes electrónicos se archivan** (no se eliminan) por el plazo legal correspondiente, en almacenamiento de bajo costo, separado de la base de datos operativa. Esta decisión de diseño evita que Softflyer, como proveedor, incumpla una obligación que en la práctica recae sobre el emisor pero que el sistema debe facilitar.

---

## 7. Pruebas de aislamiento (obligatorias, no opcionales)

🔧 El Documento N.° 02 definió la política RLS; aquí se define cómo se **verifica** que funciona, porque una política mal escrita (por ejemplo, sin `ENABLE ROW LEVEL SECURITY` en una tabla nueva) es un error silencioso: el sistema sigue funcionando, solo que sin aislamiento real.

Suite de pruebas automatizadas obligatoria antes de cada despliegue a producción:
1. **Prueba de fuga cruzada:** crear dos inquilinos de prueba, cargar datos en cada uno, y verificar programáticamente (fijando `app.inquilino_actual` a uno y consultando el otro) que ninguna fila es visible.
2. **Prueba de tabla nueva:** un chequeo automatizado en CI que falla el build si se agrega una tabla con columna `inquilino_id` sin una política RLS asociada (se puede implementar consultando el catálogo `pg_policies` de PostgreSQL y comparándolo contra la lista de tablas).
3. **Prueba de "olvido de sesión":** verificar que si no se fija `app.inquilino_actual`, las consultas no devuelven filas de ningún inquilino (fail-closed, no fail-open).

Estas pruebas corren en cada Pull Request vía GitHub Actions (ya definido en el Doc. 01 §14), no solo antes de un release grande.

---

## 8. Migraciones y despliegue en un entorno ya poblado

Con base de datos compartida (Doc. 01 §3.1), todas las migraciones afectan a todos los inquilinos a la vez. Reglas operativas:

- Migraciones que agregan columnas: siempre `NULLABLE` o con `DEFAULT`, nunca `NOT NULL` sin default sobre una tabla con datos existentes, para no bloquear el despliegue.
- Migraciones que agregan tablas de negocio nuevas: deben incluir su política RLS en el mismo *pull request* (regla ya fijada en Doc. 02, reforzada aquí con la prueba automatizada de la sección 7.2).
- Ventana de mantenimiento: no se requiere downtime para la mayoría de migraciones aditivas; sí se planifica una ventana corta para migraciones que reescriben una tabla grande (ej. cambiar el tipo de una columna con millones de filas).

---

## 9. Métricas de aprovisionamiento (extensión de la Observabilidad del Doc. 01 §13)

- Número de inquilinos por estado (`PRUEBA`/`ACTIVO`/`MOROSO`/`SUSPENDIDO`), para detectar problemas de cobranza a tiempo.
- Tiempo de aprovisionamiento (desde el registro hasta que el job de alta termina) — si crece, indica un cuello de botella en alguno de los 10 pasos de la sección 4.
- Alertas si un inquilino queda en un estado intermedio inconsistente (ej. `suscripciones` creada pero sin `usuarios`), lo cual solo debería ocurrir si la transacción de alta falló sin revertirse correctamente — señal de un bug, no de operación normal.

---

## 10. Próximo documento

Con el ciclo de vida del inquilino y el aprovisionamiento definidos, el siguiente documento lógico —siguiendo el índice original— es el **N.° 04, Facturación Electrónica (Perú — SUNAT)**, donde corresponde detallar a nivel técnico el formato UBL 2.1 del XML, el proceso de firma digital, la comunicación con el OSE/SUNAT (SEE), los códigos de error más comunes y su manejo dentro del flujo asíncrono de estados que ya quedó definido en el Documento N.° 01 y en la tabla `comprobantes` del Documento N.° 02.
