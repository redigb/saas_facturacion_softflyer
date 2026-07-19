# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 07 — APIs y Contratos

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico
**Depende de:** Doc. N.° 01 (REST versionado, Sanctum), Doc. N.° 02 (nomenclatura en español), Doc. N.° 03 (límites por plan), Doc. N.° 04 (zona horaria Lima en facturación), Doc. N.° 06 (resolución de inquilino por subdominio)

---

## 1. Objetivo

Definir el contrato que expone la API REST de Laravel al frontend Next.js (y, en Fase 4, a integradores externos), de forma que el formato de request/response, los errores, la paginación y la idempotencia queden fijados **antes** de escribir el primer controlador — evitando que cada endpoint invente su propia convención, que es el problema más común en APIs que crecen orgánicamente sin este documento.

---

## 2. Decisiones de contrato

### 2.1 Nomenclatura de recursos: español

🔧 Con la base de datos ya en español (Doc. N.° 02) y el código en inglés por convención de Laravel (Doc. N.° 02 §14), falta decidir el idioma de la **API pública** — es una tercera superficie que no se resuelve sola. Se decide: **los recursos de la API usan los mismos nombres en español que la base de datos**, no los nombres en inglés de las clases Eloquent.

```
GET  /api/v1/comprobantes
GET  /api/v1/comprobantes/{id}
POST /api/v1/ventas
GET  /api/v1/productos?categoria_id=3
```

Razón: el consumidor principal de esta API es nuestro propio frontend, construido por el mismo equipo que ya piensa en español (mismo motivo que llevó a nombrar la base de datos en español). Traducir a inglés solo en la capa HTTP introduciría una tercera convención sin necesidad real. Si en la Fase 4 aparece un integrador externo que preferiría inglés, se resuelve con una capa de alias en la documentación OpenAPI (sección 9), no cambiando los endpoints existentes.

### 2.2 El subdominio, no la URL, decide el inquilino

Como quedó definido en el Doc. N.° 06 §1.1, el inquilino se resuelve por subdominio (`donjose.softflyer.pe`), nunca como parámetro en el path o en el body. Esto significa que **ningún endpoint de esta API lleva `inquilino_id` en la URL ni en el payload** — incluirlo sería redundante y, peor, abriría la puerta a que un cliente mal construido intente pasar un `inquilino_id` distinto al de su sesión. El middleware de resolución de subdominio corre antes que cualquier otro middleware, incluido Sanctum.

### 2.3 Versionado

`/api/v1/...` desde el primer endpoint (ya fijado en Doc. N.° 01 §17). Un cambio incompatible (romper un contrato existente, no solo agregar un campo) exige `/api/v2`, conviviendo con `v1` durante un periodo de transición anunciado, nunca un reemplazo silencioso.

---

## 3. Formato estándar de respuesta

### 3.1 Éxito — recurso único
```json
{
  "data": {
    "id": 145,
    "serie": "B001",
    "correlativo": 234,
    "estado_sunat": "ACEPTADO"
  }
}
```

### 3.2 Éxito — colección (con paginación, ver sección 4)
```json
{
  "data": [ { "...": "..." } ],
  "meta": {
    "pagina_actual": 1,
    "por_pagina": 20,
    "total": 187
  }
}
```

### 3.3 Error

🔧 Sin un formato de error único, cada excepción de Laravel termina devolviendo una forma distinta (a veces un string, a veces un objeto con `message`, a veces con `errors`), y el frontend no puede manejarlas de forma genérica. Se fija un solo formato para **todo** error de la API:

```json
{
  "error": {
    "codigo": "LIMITE_PLAN_ALCANZADO",
    "mensaje": "Alcanzaste el límite de comprobantes de tu plan este mes.",
    "detalles": null
  }
}
```

Para errores de validación (422), `detalles` sí se llena, con un formato consistente por campo:

```json
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Hay campos con errores.",
    "detalles": {
      "cliente_id": ["El cliente es obligatorio."]
    }
  }
}
```

`codigo` es un identificador estable en mayúsculas (`VALIDACION`, `NO_AUTORIZADO`, `RECURSO_NO_ENCONTRADO`, `LIMITE_PLAN_ALCANZADO`, `INQUILINO_SUSPENDIDO`, `COMPROBANTE_RECHAZADO_SUNAT`, etc.) — el frontend decide qué mostrar/hacer según `codigo`, no parseando el texto de `mensaje` (que puede cambiar de redacción sin romper al cliente).

| Código HTTP | Uso |
|---|---|
| 200/201 | Éxito |
| 401 | No autenticado (token inválido/expirado) |
| 403 | Autenticado pero sin permiso (Doc. N.° 06 §5-6) |
| 404 | Recurso no existe o no pertenece al inquilino actual (nunca se distingue una cosa de la otra en la respuesta, para no filtrar si un ID existe en otro inquilino) |
| 409 | Conflicto de regla de negocio (ej. anular un comprobante ya anulado) |
| 422 | Validación de datos |
| 429 | Límite de plan o *rate limit* alcanzado |
| 500 | Error no controlado — se registra en logs con `request_id` (Doc. N.° 01 §13), nunca se expone el detalle interno al cliente |

🔧 Nota sobre el 404: se decide explícitamente que un recurso de **otro inquilino** responde igual que un recurso **inexistente** (404 genérico), nunca 403. Esto es una decisión de seguridad, no un descuido: confirmar con un 403 que "el recurso existe pero no es tuyo" ya es una fuga de información entre inquilinos, algo que iría en contra de todo el trabajo de aislamiento del Doc. N.° 02 §8.

---

## 4. Paginación

- **Offset por defecto** (`?pagina=2&por_pagina=20`) para listados de tamaño moderado (productos, clientes, usuarios) — simple de implementar y suficiente mientras el volumen por inquilino sea bajo.
- 🔧 **Cursor obligatorio** para los endpoints de alto volumen que crecen indefinidamente por inquilino con el tiempo: `comprobantes`, `movimientos_inventario` (kardex), `bitacora_auditoria`. La paginación por `OFFSET` se degrada en rendimiento a medida que crece la tabla (Postgres debe recorrer y descartar todas las filas anteriores al offset); con cursor (`?despues_de={id}`) el rendimiento se mantiene constante sin importar cuántas páginas atrás esté el registro. Se decide esto ahora, no como optimización futura, porque cambiar de paginación offset a cursor después de que el frontend ya se construyó contra un contrato de offset es un cambio incompatible de API.

---

## 5. Idempotencia en operaciones críticas

🔧 Este es el problema más importante que ningún documento anterior había cubierto: si el POS del mozo (Doc. N.° 05) pierde conexión justo después de enviar `POST /api/v1/comprobantes` pero antes de recibir la respuesta, el cliente reintentará automáticamente. Sin protección, esto puede generar **dos comprobantes tributarios para la misma venta**, con dos correlativos distintos — un error que no se puede simplemente "anular y ya", porque ambos ya fueron enviados a SUNAT antes de que alguien lo note.

**Decisión:** los endpoints de escritura no repetibles de forma segura (`POST /api/v1/comprobantes`, `POST /api/v1/ventas`, `POST /api/v1/pagos`) exigen un header `Idempotency-Key` generado por el cliente (un UUID por intento de operación, no por reintento):

```
POST /api/v1/comprobantes
Idempotency-Key: 3f29b1e4-8a2d-4c11-9e77-1a2b3c4d5e6f
```

Tabla `claves_idempotencia`: `inquilino_id`, `clave` (el UUID), `endpoint`, `respuesta_guardada` (JSONB), `creado_en`. Si llega una request con una `Idempotency-Key` ya vista para ese inquilino y ese endpoint, el sistema **no vuelve a ejecutar la operación**: devuelve la respuesta guardada la primera vez, con el mismo código HTTP. Esto convierte el reintento de red en una operación segura por diseño, en vez de confiar en que el cliente "no reintente por las dudas".

---

## 6. Límites de plan y *rate limiting*

Sobre lo ya definido en el Doc. N.° 03 §5 (validación contra `uso_inquilino`/`planes`), la API responde con `429` y `codigo: "LIMITE_PLAN_ALCANZADO"` cuando corresponde. Además, se agrega un *rate limit* técnico independiente del plan comercial (protección de infraestructura, no de negocio): 60 requests/minuto por token, con `codigo: "LIMITE_TECNICO_ALCANZADO"` — para distinguir claramente, en el propio código de error, un límite de negocio (hay que subir de plan) de un límite técnico (hay que esperar unos segundos), porque el frontend debe reaccionar distinto a cada uno.

---

## 7. Fechas y zonas horarias

🔧 El Doc. N.° 04 ya exigía zona horaria de Lima explícita para `fecha_emision` en el envío a SUNAT; aquí se fija la regla para **toda** la API, no solo facturación, porque sin una regla única cada endpoint terminaría serializando fechas de forma distinta:

- Toda marca de tiempo (`creado_en`, `actualizado_en`, `enviado_en`, etc.) se serializa en **UTC**, formato ISO 8601 (`2026-07-18T15:30:00Z`). La conversión a hora de Lima es responsabilidad del frontend, no del backend.
- Los campos que son **fechas de negocio sin componente de hora** (`fecha_emision` de un comprobante, `fecha_vencimiento` de una suscripción) se serializan como fecha simple (`2026-07-18`), sin hora ni zona horaria, precisamente para que no haya ambigüedad de a qué hora "empieza" ese día — algo que si se mezclara con UTC podría hacer que un comprobante emitido a las 11pm en Lima pareciera pertenecer al día siguiente al convertir a UTC.

---

## 8. Autenticación y permisos por endpoint

Cada ruta declara el permiso requerido (catálogo del Doc. N.° 06 §5) mediante *Policies* de Laravel, nunca verificado a mano dentro del controlador — esto evita que un desarrollador olvide la verificación en un endpoint nuevo, porque el *Policy* se declara junto con la ruta y el framework la exige automáticamente. La verificación de alcance por sucursal (Doc. N.° 06 §6) vive en el mismo *Policy*, no en una capa aparte, para que ambas reglas (permiso + sucursal) no puedan olvidarse por separado.

---

## 9. Documentación viva (OpenAPI) y generación de tipos

Se genera una especificación **OpenAPI 3.1** a partir de anotaciones en el propio código (no un documento Word mantenido a mano, que se desactualiza en la primera semana). El frontend Next.js genera sus tipos TypeScript directamente desde ese OpenAPI, de forma que un cambio de contrato en el backend (ej. renombrar un campo) rompa la compilación del frontend en vez de fallar en producción de forma silenciosa. Esta especificación es también la base para, en Fase 4, publicar la documentación de la API pública a integradores externos sin trabajo adicional de redacción.

---

## 10. Webhooks (previsión para Fase 4, no implementación actual)

Se deja anotado, sin implementar todavía, el diseño que tendrán los webhooks salientes cuando existan integradores externos (ej. notificar a un ERP externo cuando un comprobante cambia a `ACEPTADO`): payload firmado con HMAC (clave secreta por integrador), reintentos con backoff ante fallas del endpoint receptor, y un log de entregas consultable por el integrador — el mismo patrón de idempotencia de la sección 5 aplica también aquí, del lado de quien recibe el webhook.

---

## 11. Ejemplo de contrato completo (emisión de comprobante)

```
POST /api/v1/comprobantes
Idempotency-Key: 3f29b1e4-8a2d-4c11-9e77-1a2b3c4d5e6f
Authorization: Bearer {token_sanctum}

{
  "venta_id": 982,
  "tipo_comprobante_id": 1,
  "cliente_id": 55
}
```

Respuesta `201`:
```json
{
  "data": {
    "id": 145,
    "serie": "B001",
    "correlativo": 234,
    "fecha_emision": "2026-07-18",
    "estado_sunat": "PENDIENTE_ENVIO",
    "monto_total": 118.00
  }
}
```

Nótese que la respuesta inmediata **no espera** el resultado de SUNAT (flujo asíncrono, Doc. N.° 04 §6): el estado devuelto es `PENDIENTE_ENVIO`. El frontend se suscribe al mismo canal de Reverb ya usado para el KDS (Doc. N.° 05 §5) para recibir el evento `ComprobanteActualizado` cuando el estado cambie a `ACEPTADO`/`RECHAZADO`, en vez de hacer *polling* al endpoint.

---

## Cierre de la suite de documentos (por ahora)

Con este N.° 07 completamos el bloque que va de la arquitectura general al primer contrato de API — es decir, todo lo necesario para empezar a construir el Core y el módulo Restaurante con una base coherente, sin contradicciones entre documentos.

Quedan pendientes del índice original, para cuando quieras retomarlos:

| N.° | Documento | Motivo para no bloquear el inicio del desarrollo |
|---|---|---|
| 08 | Infraestructura y DevOps | El esbozo del Doc. N.° 01 §15 (entornos) y §14 (CI) ya alcanza para empezar; el detalle fino (backups, pipeline completo) puede madurar en paralelo al primer sprint |
| 09 | Estándares de Desarrollo | Ya cubierto a nivel de principios en Doc. N.° 01 §17; lo que falta es ejemplo de código real, que rinde más una vez que exista el primer módulo escrito |
| 10 | Roadmap del Producto | Ya esbozado en Doc. N.° 01 §16 y Doc. N.° 03; conviene formalizarlo con fechas cuando haya un equipo y una capacidad de desarrollo estimada, no antes |
| 00 | Visión y Objetivos | Existe en la conversación inicial; es más una portada ejecutiva que una pieza técnica — se puede redactar en 15 minutos cuando se arme el documento consolidado final |

Con los Documentos 01 a 07 tienes ya una base técnica sólida y sin contradicciones internas para empezar las migraciones de Laravel del Núcleo y del módulo Restaurante.
