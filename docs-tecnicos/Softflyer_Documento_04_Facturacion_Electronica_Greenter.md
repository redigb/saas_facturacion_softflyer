# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 04 — Facturación Electrónica (Perú — SUNAT) con Greenter

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico
**Depende de:** Doc. N.° 01 (envío asíncrono, certificados por empresa), Doc. N.° 02 (tabla `comprobantes`), Doc. N.° 03 (ciclo de vida del inquilino)
**Librería adoptada:** [thegreenter/greenter](https://github.com/thegreenter/greenter) (PHP, licencia MIT)

---

## 1. Qué resuelve Greenter y qué no

Reviso el repositorio para dejar claro qué parte de la arquitectura ya no hay que construir, y qué parte sigue siendo responsabilidad nuestra — porque adoptar una librería sin delimitar esa frontera es la forma más común en que un proyecto termina reimplementando por accidente lo que la librería ya hacía, o al revés, asumiendo que la librería resuelve algo que no resuelve.

Greenter es un conjunto de paquetes (monorepo) que cubre exactamente las tareas técnicas de bajo nivel que en el Documento N.° 01 dejamos descritas como "generar XML, firmar, enviar, procesar CDR":

| Paquete | Responsabilidad |
|---|---|
| `greenter/xml` | Construye el XML según el estándar **UBL 2.1** a partir de un modelo de objetos PHP (Factura, Boleta, Nota de Crédito, Nota de Débito, Resumen Diario, Comunicación de Baja) |
| `greenter/xmldsig` | Firma digitalmente el XML con el certificado de la empresa |
| `greenter/ws` | Envía el XML firmado al webservice SOAP de SUNAT (o de un OSE) y recibe el CDR |
| `greenter/xml-parser` | Interpreta el CDR recibido (aceptado / observado / rechazado) |
| `greenter/report` | Genera la representación impresa (PDF) a partir de plantillas Twig |

La clase de fachada `Greenter\See` **encadena estos cinco pasos en un solo método `send()`**, lo cual coincide exactamente con la responsabilidad que en el Documento N.° 01 asignamos al Job de la cola.

**Lo que Greenter NO resuelve, y sigue siendo nuestro:**
- El estado de negocio del comprobante dentro de Softflyer (`PENDIENTE_ENVIO`, `ENVIADO`, `ACEPTADO`, etc. — tabla `comprobantes` del Doc. N.° 02).
- El mapeo entre nuestras tablas (`comprobantes`, `detalle_comprobantes`) y el modelo de objetos de Greenter.
- El manejo de reintentos y colas (Laravel Queue, ya definido).
- El almacenamiento cifrado del certificado y las credenciales Clave SOL por empresa (Doc. N.° 01 §3.5).
- El proceso administrativo de homologación ante SUNAT (sección 7).

🔧 En otras palabras: Greenter reemplaza la "Infrastructure" del módulo Billing (la parte que hablaría directamente con SUNAT); el "Domain" y "Application" del módulo (nuestras reglas: qué se puede facturar, cuándo, con qué serie) se mantienen tal como se diseñaron.

---

## 2. Requisitos técnicos y ajuste de infraestructura

- PHP `7.4` o superior (mínimo declarado por el proyecto), extensiones `soap`, `openssl`, `zlib`, `curl`.
- 🔧 **Punto a verificar antes de comprometer el stack:** nuestro Doc. N.° 01 fija PHP 8.4. Greenter declara un piso de PHP 7.4, pero eso no garantiza automáticamente un techo compatible con 8.4 en todas sus dependencias transitivas. Antes de fijar la versión en `composer.json`, corresponde instalar la última release (v5.3.0 a la fecha) en un entorno de prueba con PHP 8.4 y correr su propio *test suite*, no asumir compatibilidad solo por el número mínimo declarado.
- Se agregan al `Dockerfile` del backend las extensiones `soap` y `zlib` (Laravel 12 ya suele traer `openssl`/`curl`), ya que no estaban contempladas en el Documento N.° 01.
- Instalación recomendada vía Composer: paquete `greenter/lite` (agrupa xml + xmldsig + ws + xml-parser) para no gestionar versiones sueltas de cada paquete.

---

## 3. Ajuste al modelo de datos (extensión del Documento N.° 02)

Se agregan tres columnas a `comprobantes`, que no eran necesarias hasta tener una librería concreta con la que integrarse:

| Columna nueva | Tipo | Motivo |
|---|---|---|
| `intentos_envio` | INT default 0 | Greenter puede fallar por un problema de red/timeout con SUNAT, distinto de un rechazo tributario; se necesita contar reintentos para aplicar el backoff del Doc. N.° 01 §3.4 |
| `ultimo_error_tecnico` | TEXT nullable | Guarda el mensaje de error de conexión (no el rechazo tributario, que ya vive en `codigo_respuesta_sunat`), para depuración por soporte |
| `formato_certificado` | VARCHAR | `PEM` o `PFX` — ver sección 4 |

También se ajusta `empresas.certificado_digital_id` (Doc. N.° 02 §3.2): Greenter exige el certificado en formato **PEM**. Si la empresa entrega un `.pfx`/`.p12` (lo más común, porque así lo entrega SUNAT), se convierte **una sola vez**, en el momento del alta de la empresa, usando el conversor que el propio proyecto Greenter provee (paquete `xmldsig`), y se almacena cifrado el resultado en PEM — no el `.pfx` original ni la contraseña del `.pfx` por separado. Esto evita tener que repetir la conversión (y volver a exponer la contraseña del `.pfx` en memoria) en cada envío.

---

## 4. Instanciación de `Greenter\See` en un contexto multi-tenant

🔧 Este es el ajuste más importante de este documento sobre el diseño previo. Greenter está pensado, en sus ejemplos, para **una sola empresa por instalación** (un `$see` configurado una vez en `config.php`). Nuestro sistema es multi-tenant: cada `empresa` (Doc. N.° 02 §3.2) tiene su propio certificado y sus propias credenciales Clave SOL.

**Decisión:** `Greenter\See` **nunca** se registra como servicio único (singleton) del contenedor de Laravel. Se instancia **una vez por Job**, dentro del propio Job de envío, con los datos de la empresa dueña de ese comprobante:

```php
// Dentro del Job de envío (procesa un comprobante en estado PENDIENTE_ENVIO)

$empresa = $comprobante->empresa; // relación ya cargada
$certificadoPem = $this->descifrarCertificado($empresa->certificado_digital_id);
$claveSol = $this->descifrarClaveSol($empresa);

$see = new \Greenter\See();
$see->setCertificate($certificadoPem);
$see->setService(
    app()->environment('production')
        ? \Greenter\Ws\Services\SunatEndpoints::FE_PRODUCCION
        : \Greenter\Ws\Services\SunatEndpoints::FE_BETA
);
$see->setClaveSOL($empresa->ruc, $empresa->usuario_sol, $claveSol);

$result = $see->send($comprobanteGreenter);

// $see y las credenciales descifradas se descartan al terminar el Job,
// nunca se cachean ni se reutilizan entre empresas.
```

Esto evita el riesgo real de que, por una mala práctica de cacheo, el Job de la empresa A termine usando por error la sesión SOAP configurada para la empresa B — un error que en un sistema de facturación tributaria tendría consecuencias legales, no solo técnicas.

El entorno (Beta/Producción) se decide por el entorno de despliegue, no por empresa individual dentro de un mismo entorno: **todas** las empresas en `staging` usan `FE_BETA`; en `production`, cada empresa usa `FE_PRODUCCION` únicamente después de haber completado su propio proceso de homologación (sección 7) — una empresa que aún no homologó no debe poder emitir en producción aunque el entorno lo sea.

---

## 5. Mapeo entre nuestro modelo (español) y el modelo de Greenter (inglés/mixto)

Greenter usa sus propias clases (`Invoice`, `SaleDetail`, `Client`, `Company`, `Address`, `Legend`, `CreditNote`, `DebitNote`) con nombres en inglés y algunos en español, siguiendo el estándar UBL. Esto no entra en conflicto con nuestra decisión de nombrar la base de datos en español (Doc. N.° 02): el mapeo ocurre en la capa `Infrastructure` del módulo Billing, que es exactamente el lugar donde ya habíamos previsto que vivieran las integraciones externas.

| Nuestro modelo (`comprobantes` / `detalle_comprobantes`) | Modelo Greenter | Notas |
|---|---|---|
| `comprobantes.tipo_comprobante_id` → texto (`01`,`03`,`07`,`08`) | `Invoice::setTipoDoc()` / `CreditNote` / `DebitNote` | Factura y Boleta comparten la misma clase `Invoice`; el tipo se distingue por el código |
| `comprobantes.serie` + `correlativo` | `setSerie()` + `setCorrelativo()` | |
| `comprobantes.fecha_emision` | `setFechaEmision()` | Requiere zona horaria Lima explícita |
| `empresas.ruc/razon_social/direccion_fiscal` | `Company` + `Address` | Se arma una vez por empresa, reutilizable dentro del mismo Job |
| `clientes.numero_documento/nombre` | `Client` | |
| `comprobantes.moneda_id` | `setTipoMoneda()` | Catálogo 02 SUNAT, ya contemplado en Doc. N.° 02 §4 |
| `detalle_comprobantes` (cada fila) | `SaleDetail` | `producto.sku`→`setCodProducto()`, `cantidad`→`setCantidad()`, etc. |
| `comprobantes.comprobante_relacionado_id` + `motivo_nota_credito_id` | `CreditNote`/`DebitNote` con referencia al comprobante afectado | |

Este mapeo se implementa como un *Mapper* dedicado (`ComprobanteGreenterMapper`) dentro de `Modules/Billing/Infrastructure`, para que si Greenter cambia su API en una versión futura, el cambio se aísle en una sola clase y no se disperse por todo el módulo.

---

## 6. Flujo asíncrono actualizado (sustituye el pseudo-flujo del Doc. N.° 01 §3.4)

1. Se genera el comprobante en `comprobantes` con `estado_sunat = 'PENDIENTE_ENVIO'`.
2. Un Job en cola (driver `database`, según Doc. N.° 01) toma el comprobante, arma el `$see` de la empresa (sección 4) y mapea el comprobante al modelo Greenter (sección 5).
3. Se llama `$see->send($comprobanteGreenter)`.
4. Se guarda el XML firmado (`$see->getFactory()->getLastXml()`) en `ruta_xml`.
5. Si `$result->isSuccess()` es `false`: es un **error técnico/de conectividad** (SUNAT no disponible, timeout, error SOAP) — se incrementa `intentos_envio`, se guarda el mensaje en `ultimo_error_tecnico`, el comprobante permanece en `PENDIENTE_ENVIO` y el Job se reintenta con backoff. Tras un máximo de intentos (propuesta: 5), pasa a una cola de revisión manual, tal como ya preveía el Doc. N.° 01.
6. Si `$result->isSuccess()` es `true`, se lee el CDR (`$result->getCdrResponse()`):
   - Código `0`: `estado_sunat = 'ACEPTADO'` (si trae observaciones, se guardan como notas informativas, el comprobante sigue válido).
   - Código entre `2000` y `3999`: `estado_sunat = 'RECHAZADO'` — es un rechazo tributario real (dato mal formado, RUC inválido, etc.), no un problema de red; no se reintenta automáticamente, requiere corrección del comprobante por parte del usuario.
   - Cualquier otro código: se trata como excepción/error técnico (mismo camino que el punto 5), porque un CDR fuera de esos rangos indica una respuesta inesperada, no un rechazo de negocio normal.
7. Se guarda el CDR (`ruta_cdr`) y se actualiza `aceptado_en`.
8. Se genera la representación impresa en PDF con `greenter/report` (plantillas Twig) y se guarda en `ruta_pdf`.

---

## 7. Proceso de homologación — corrección de un supuesto del Documento N.° 01

🔧 En el Documento N.° 01 se dejó anotado, de forma genérica, que "la homologación toma tiempo y debe tratarse como dependencia externa". Con Greenter documentado, se puede precisar: **la homologación no es un trámite de Softflyer como proveedor, sino de cada empresa cliente (cada RUC)**, porque es la empresa —no la plataforma— quien se convierte en emisor electrónico ante SUNAT. Softflyer facilita el proceso, pero no lo hace en nombre del cliente ni una sola vez para toda la plataforma.

Pasos, por empresa, antes de emitir en `FE_PRODUCCION`:

1. La empresa crea en el portal de SUNAT un **usuario secundario** con permisos de Facturación Electrónica (esto lo hace el cliente, no Softflyer, porque requiere su Clave SOL de administrador).
2. Ese usuario secundario tarda **hasta 24 horas** en activarse — es un tiempo de espera real, no técnico.
3. La empresa registra su certificado digital en el portal SUNAT (formato `.cer`, solo clave pública).
4. Softflyer, en el flujo de aprovisionamiento del Documento N.° 03 (sección 4, alta de empresa), agrega un paso de configuración donde el cliente sube su certificado `.pfx`/`.p12` y sus credenciales Clave SOL; el sistema convierte el certificado a PEM (sección 3) y lo deja listo, pero **la empresa permanece en modo Beta hasta confirmar** que completó los pasos 1 a 3 fuera del sistema.
5. Recién entonces se habilita `FE_PRODUCCION` para esa empresa específica.

Esto también implica un ajuste menor al Documento N.° 03: conviene agregar un campo `empresas.homologado` (booleano) que controle si esa empresa puede emitir en producción, independientemente del entorno de despliegue de Softflyer.

---

## 8. Nota sobre Guía de Remisión (relevante para el módulo Distribuidora, Fase 3)

Un hallazgo del repositorio que vale la pena dejar registrado ahora, aunque no aplique a la Fase 1 (Restaurante): desde diciembre de 2022, la Guía de Remisión Electrónica **no** se envía por el mismo mecanismo SOAP que factura/boleta, sino por una **API REST separada** (`Greenter\Api`, con endpoints `api-seguridad.sunat.gob.pe` y `api-cpe.sunat.gob.pe`), que requiere credenciales API adicionales generadas en el portal SUNAT, distintas de la Clave SOL. Cuando se aborde el módulo Distribuidora (que sí necesita guías de remisión para sustentar traslados de mercadería), habrá que extender el modelo de `empresas` con un segundo juego de credenciales (API, no Clave SOL) y un cliente HTTP adicional junto al `See` ya usado para comprobantes. Se deja anotado aquí para no descubrirlo recién al construir ese módulo.

---

## 9. Seguridad específica de esta integración

- El certificado descifrado y la contraseña Clave SOL **nunca se escriben a logs**, ni siquiera en el mensaje de una excepción — los `catch` alrededor de `$see->send()` deben capturar el mensaje de error de Greenter/SOAP pero sanitizarlo antes de guardarlo en `ultimo_error_tecnico`, porque algunos clientes SOAP incluyen el request completo (que contiene datos del certificado) en el stack trace por defecto.
- El certificado permanece descifrado únicamente en la memoria del proceso del Job, durante la ejecución de `send()`; no se escribe a un archivo temporal en disco salvo que Greenter lo requiera internamente, en cuyo caso ese archivo temporal debe crearse en un directorio no persistente y borrarse explícitamente al terminar el Job (no confiar solo en la limpieza automática del sistema operativo).

---

## 10. Próximo documento

Con Greenter integrado como motor de bajo nivel, el siguiente documento lógico del índice original es el **N.° 05 — Módulo Restaurante**, que ya puede darse por completo independiente de la parte SUNAT (esta ya quedó resuelta aquí) y enfocarse en mesas, comandas, cocina (KDS) y el punto donde un `pedido` genera una `venta` que dispara este flujo de facturación.
