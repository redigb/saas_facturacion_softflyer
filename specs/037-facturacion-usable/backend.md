# 037 — Backend

## Contrato

### Cambia: forma del comprobante (`GET /comprobantes/{id}` y el `comprobante` del cobro)

Se agregan campos; ninguno se quita:

```json
{
  "sucursal": "Local Centro",
  "op_exonerada": "0.00",
  "op_inafecta": "0.00",
  "importe_en_letras": "SON DOCE CON 00/100 SOLES",
  "leyenda": null,
  "representacion_impresa": "Representación impresa de la BOLETA DE VENTA ELECTRÓNICA",
  "hash": "q2hY…=",
  "qr": "20123456789|03|B001|1|1.83|12.00|2026-10-29|0|0|q2hY…=|",
  "mensaje_sunat": null,
  "tiene_xml": true,
  "tiene_cdr": true
}
```

En un comprobante simulado, `representacion_impresa`, `hash` y `qr` son `null`.

`leyenda` es el texto de la leyenda de la Amazonía (catálogo 15: 2001 bienes, 2002 servicios), la misma que va en el XML. Es `null` si el comprobante no tiene nada exonerado.

### Nuevo: `GET /comprobantes/historial`

Permiso `comprobantes.emitir`. Parámetros opcionales:

| Parámetro | Valor |
|---|---|
| `desde`, `hasta` | `YYYY-MM-DD`, fecha de emisión en hora de Lima |
| `tipo` | `BOLETA` o `FACTURA` |
| `estado` | `ACEPTADOS`, `EN_PROCESO`, `CON_PROBLEMAS` o `SIMULADOS` |
| `buscar` | número (`B001-12`), documento o nombre del cliente |
| `pagina`, `por_pagina` | por defecto 1 y 20 (máximo 50) |

```json
{ "data": [ /* comprobantes */ ],
  "meta": { "pagina_actual": 1, "por_pagina": 20, "total": 134, "ultima_pagina": 7 } }
```

### Nuevo: `GET /comprobantes/{id}/xml` y `GET /comprobantes/{id}/cdr`

Permiso `comprobantes.emitir`. Devuelven el archivo (`{RUC}-{tipo}-{serie}-{número}.xml` o `R-….zip`). `404` si aún no existe.

## Decisiones

- **El hash se calcula al emitir.** `SunatGateway::sign()` firma el XML solo con el certificado, sin salir a internet. `IssueReceipt` lo guarda en `hash_firma`. Si la firma falla, el cobro no se cae: se registra el error y el Job lo completa al enviar. El DigestValue no cambia al volver a firmar porque el documento es el mismo.
- **Grupos de estado** para el filtro:
  - `ACEPTADOS` = ACEPTADO, OBSERVADO.
  - `EN_PROCESO` = PENDIENTE_ENVIO, ENVIADO, SIN_CDR.
  - `CON_PROBLEMAS` = RECHAZADO, VENCIDO.
  - `SIMULADOS` = `es_simulado`.
- **Alcance por local.** El historial solo trae comprobantes de los locales donde trabaja el usuario. Las descargas usan la misma regla que `show`.
- **QR según SUNAT.** Fecha en `YYYY-MM-DD`. Si el cliente no tiene documento, usa tipo `0` y número `0`, igual que el XML.

## Tareas

- [x] `SunatGateway::sign()` en `GreenterGateway` y en el doble de las pruebas
- [x] `IssueReceipt` guarda el hash al emitir un comprobante real
- [x] `ReceiptPresenter`: campos nuevos
- [x] `ReceiptController::history`, `xml` y `cdr`, y sus rutas
- [x] Pruebas: hash al emitir aunque SUNAT esté caída, QR, historial con filtros y alcance, descargas y permisos
