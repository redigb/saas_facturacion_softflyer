# 011 — Facturación electrónica con Greenter

**Estado:** ⚪ Pendiente de diseño (no se abre hasta cerrar la 010 y resolver las decisiones abiertas)
**Backend:** ⚪ · **Frontend:** ⚪
**Hito:** H3 real (Doc. 09 §2) — cumple el objetivo 2 del cliente: "no facturar a mano"
**Documentos:** Doc. 04 (todo), Doc. 08 §11 (comprobantes, series, resúmenes), Doc. 06 §9 (seguridad de la integración)

## Qué y por qué

La spec 010 deja comprobantes **simulados**: numerados, con cliente y listos para imprimir, pero sin validez tributaria. Esta spec los vuelve **reales**: se firman con el certificado de la empresa, se envían a SUNAT por cola y guardan su respuesta (CDR). El cobro nunca espera a SUNAT.

La 010 ya dejó el enganche (`IssueReceipt`), la numeración por serie y el JSON de comprobante; aquí solo se agrega lo que falta (ver *Preparación para Greenter* en `010-comprobante-simulado/backend.md`).

## Decisiones abiertas (resolver antes de abrir)

- [ ] **¿Certificado real o entorno beta de SUNAT primero?** Define si el piloto ya tiene RUC, certificado digital y usuario SOL, o se empieza contra beta (Doc. 04 §7, homologación).
- [ ] **Tasa de IGV:** tasa reducida para MYPE de restaurantes (Ley 31556 y prórrogas) o 18 %; validar con un contador antes de cargar `tasas_igv` (Doc. 08 §11.1).
- [ ] **Afectación por producto:** ¿todo gravado o hay productos exonerados/inafectos en la carta del piloto?
- [ ] **Boleta ≥ S/ 700:** confirmar que se exige identificar al cliente y cómo se pide en la pantalla de cobro.
- [ ] **Driver de cola en producción:** `database` vs Redis (Doc. 09 §3.7) y supervisor del worker.
- [ ] **Almacenamiento de XML/CDR/PDF:** disco local, S3 u otro, y retención (SUNAT pide 5 años).
- [ ] **PDF/ticket:** ¿PDF A4 generado en servidor o solo el ticket del navegador?

## Alcance previsto

- Emisión real de **boleta y factura**: XML UBL 2.1, firma, envío, lectura del CDR.
- Estados `PENDIENTE_ENVIO → ENVIADO → ACEPTADO / OBSERVADO / RECHAZADO`, con reintentos y backoff, visibles en la lista de comprobantes.
- Pantalla de **configuración fiscal** de la empresa: RUC, razón social, dirección, ubigeo, carga de certificado, usuario y clave SOL (cifrada).
- Tabla `clientes` con "CLIENTES VARIOS" y búsqueda por DNI/RUC.
- `detalle_comprobantes` con valor y precio unitario por separado.
- Afectación IGV por producto y tasa con vigencia.
- Aviso al cajero cuando un comprobante queda rechazado, con acción de reenvío.

## Criterios de aceptación (borrador)

- [ ] Cobrar una cuenta nunca espera a SUNAT: el cajero recibe el número al instante.
- [ ] Un comprobante real aparece como `ACEPTADO` en la lista tras el envío, con su CDR guardado.
- [ ] Si SUNAT no responde, la venta queda cobrada y el comprobante se reintenta solo; el cajero ve "Pendiente de envío".
- [ ] Un comprobante rechazado muestra el motivo en lenguaje claro y permite corregir y reenviar.
- [ ] Los comprobantes simulados de la 010 nunca se envían.
- [ ] La clave SOL y el certificado nunca viajan al navegador ni a los logs.

## Fuera de alcance (specs posteriores)

- Notas de crédito y débito, comunicaciones de baja y resumen diario (anulaciones).
- Guía de remisión (módulo Distribuidora, Fase 3).
- Multimoneda.
