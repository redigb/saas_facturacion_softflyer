# 017 — Facturación electrónica con Greenter (índice)

**Estado:** 🟡 Diseño cerrado (2026-10-19) · se implementa en tres partes
**Hito:** H3 real (Doc. 09 §2) — cumple el objetivo 2 del cliente: "no facturar a mano"
**Documentos:** Doc. 04 (todo), Doc. 08 §11 (comprobantes, series, resúmenes), Doc. 06 §9 (seguridad de la integración)

## Qué y por qué

La spec 010 deja comprobantes **simulados**. Esta línea los vuelve **reales**: se firman con el certificado de la empresa, se envían a SUNAT por cola y guardan su respuesta (CDR). El cobro nunca espera a SUNAT.

Motor decidido: **Greenter** (`greenter/lite` ^5.3), sin proveedores intermedios. Verificado el 2026-10-19: instala en PHP 8.3 y genera y firma un XML UBL 2.1 de boleta (extensiones `soap`, `zlib`, `openssl` activas).

## Partes

| Spec | Entrega | Estado |
|---|---|---|
| [017a](../017a-configuracion-fiscal/spec.md) | Configuración fiscal: certificado, clave SOL, tasa y afectación IGV; la administra Softflyer desde el backoffice | ✅ cerrada |
| [017b](../017b-emision-greenter/spec.md) | Emisión: clientes, detalle, mapper, Job, XML firmado, envío a beta, CDR | ⚪ |
| [017c](../017c-estado-operacion/spec.md) | Estado en la lista, rechazos, reenvío, vista en el backoffice | ⚪ |

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Entorno | SUNAT **beta** con certificado de prueba. Producción solo para empresas con `empresas.homologado` (Doc. 04 §7). |
| Tasa de IGV | Tabla `tasas_igv` con vigencia, sembrada al 18 %. Cualquier tasa reducida se carga cuando un contador la valide. |
| Afectación | Gravado por defecto. Exonerado e inafecto se configuran **desde el panel de configuración** (tasas y afectación), no como campo suelto en la carta. |
| Boleta ≥ S/ 700 | Exige identificar al cliente; la pantalla de cobro lo pide antes de emitir. |
| Cola | Driver `database`, backoff, 5 intentos y luego revisión manual (Doc. 04 §6). |
| Archivos | Disco privado local detrás de una interfaz (cambiar a S3 es configuración). Retención de 5 años. |
| PDF | Solo ticket del navegador, **con código QR**. PDF A4 queda para después. |
| `See` | Una instancia por Job, nunca singleton (Doc. 04 §4). |

## Tomado como referencia (no se integra ningún tercero)

Respuesta inmediata con estado de cola, enlaces de descarga de XML, CDR y PDF desde la lista, y evento interno al aceptarse o rechazarse un comprobante para avisar al cajero en tiempo real.

## Criterios de aceptación globales

- [ ] Cobrar una cuenta nunca espera a SUNAT: el cajero recibe el número al instante.
- [ ] Un comprobante real aparece como `ACEPTADO` tras el envío, con su CDR guardado.
- [ ] Si SUNAT no responde, la venta queda cobrada y el comprobante se reintenta solo.
- [ ] Un rechazo muestra el motivo en lenguaje claro y permite corregir y reenviar.
- [ ] Los comprobantes simulados de la 010 nunca se envían.
- [ ] La clave SOL y el certificado nunca viajan al navegador ni a los logs.

## Fuera de alcance (specs posteriores)

- Notas de crédito y débito, comunicaciones de baja y resumen diario.
- Guía de remisión (módulo Distribuidora, Fase 3; usa API REST aparte, Doc. 04 §8).
- Multimoneda y PDF A4.
