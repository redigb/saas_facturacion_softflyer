# 010 — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino, `Authorization: Bearer`. Permiso `ventas.crear`.

### `POST /pedidos/{id}/cobro` (se amplía)

Cuerpo opcional nuevo:

```json
{ "cliente": { "tipo_documento": "RUC", "numero": "20123456789", "nombre": "Inversiones SAC" } }
```

| Campo | Regla |
|---|---|
| `cliente.tipo_documento` | `DNI` o `RUC` |
| `cliente.numero` | DNI: 8 dígitos. RUC: 11 dígitos con dígito verificador válido |
| `cliente.nombre` | Obligatorio con RUC (razón social); opcional con DNI |

Sin `cliente` → boleta a "CLIENTES VARIOS". Con RUC → factura. Con DNI → boleta con sus datos.

La respuesta suma `comprobante` (forma de abajo).

### Comprobante

```json
{
  "id": 5, "venta_id": 9, "tipo": "BOLETA", "serie": "B001", "correlativo": 12, "numero": "B001-00000012",
  "estado": "EMITIDO", "es_simulado": true, "emitido_en": "2026-10-12T20:15:00Z",
  "empresa": { "razon_social": "Don José SAC", "ruc": "20123456789", "nombre_comercial": "Don José", "direccion": null },
  "cliente": { "tipo_documento": "DNI", "numero": "12345678", "nombre": "Ana Pérez" },
  "op_gravada": "46.61", "igv": "8.39", "total": "55.00",
  "lineas": [ { "descripcion": "Lomo saltado", "cantidad": "1.000", "precio_unitario": "45.00", "total": "45.00" } ],
  "pagos": [ { "metodo": "Efectivo", "monto": "55.00" } ]
}
```

### Endpoints nuevos

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/comprobantes?sesion_caja_id=` | 200 lista (más reciente primero). Sin parámetro: el turno abierto del usuario |
| GET | `/comprobantes/{id}` | 200 un comprobante, para reimprimir |

Un comprobante de otra sucursal del usuario no existe para él (403).

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `VALIDACION` | RUC con dígito verificador inválido, DNI mal formado, factura sin razón social |

## Decisiones

- **Misma transacción que el cobro:** venta, pagos y comprobante se guardan juntos o no se guarda nada; el correlativo se toma con la fila de la serie bloqueada, así dos cobros simultáneos no repiten número.
- **Series existentes:** se reutiliza `series_comprobante` (Doc. 08 §11.2). Si la sucursal no tiene serie del tipo, se crea `B001` / `F001` (o la siguiente libre de la empresa).
- **`es_simulado`:** columna explícita para que, con Greenter, los comprobantes simulados nunca se confundan con los reales ni se envíen a SUNAT.
- **Punto de enganche:** `Core/Billing/Application/IssueReceipt` es el único lugar que cambiará al integrar Greenter. El cobro solo le pide "emite el comprobante de esta venta" y recibe el número; no sabe cómo se emite.
- **Sin tabla `clientes`:** los datos del cliente viajan en el comprobante; la tabla y la búsqueda llegan con Greenter.

## Preparación para Greenter

Esta spec **no** integra Greenter (queda en la spec 011, pendiente de diseño). Lo que sí deja es el terreno firme: lo que cambiará es aditivo y no rompe el contrato de arriba ni la pantalla.

### Qué ya cumple el Doc. 04 / Doc. 08 §11

| Tema | Estado en la 010 |
|---|---|
| Series por RUC, `UNIQUE (empresa, tipo, serie)` y formato `^[BF][A-Z0-9]{3}$` | ✅ tabla `series_comprobante` ya existente |
| Correlativo sin duplicados (fila de la serie bloqueada en la transacción) | ✅ |
| `UNIQUE (empresa, tipo, serie, correlativo)` y un comprobante por venta | ✅ |
| Boleta por defecto, factura si el cliente tiene RUC válido (módulo 11) | ✅ |
| Cliente congelado en el comprobante (tipo, número, nombre) | ✅ |
| Totales `op_gravada + igv = total` con el mismo `CHECK` que la venta | ✅ (ventas) |
| Cobro no espera al comprobante visible | ✅ el enganche es un único método |

### Qué falta y dónde se agrega (spec 011)

| Pendiente | Cómo se agrega sin romper nada |
|---|---|
| `estado_sunat`, `codigo_respuesta_sunat`, `descripcion_respuesta_sunat`, `hash_cpe`, `ruta_xml/cdr/pdf`, `intentos_envio`, `ultimo_error_tecnico`, `enviado_en`, `aceptado_en` | Migración aditiva en `comprobantes` con valores nulos; los simulados quedan con `estado_sunat` nulo |
| `detalle_comprobantes` (valor unitario sin IGV, unidad de medida, código de afectación) | Tabla nueva. Hasta entonces las líneas del ticket salen de `detalle_ventas`; el presentador cambiará de fuente sin cambiar el JSON |
| `moneda_id`, `fecha_emision` (fecha de Lima) | Columnas con valor por defecto PEN y la fecha de `emitido_en` |
| `cliente_id` y tabla `clientes` ("CLIENTES VARIOS", búsqueda por DNI/RUC) | Tabla nueva; `comprobantes.cliente_id` nulo para los simulados |
| `cliente_direccion` | Columna nula |
| Tasa de IGV con vigencia (`tasas_igv`, `empresas.aplica_tasa_reducida`) | Hoy `RegisterSale` usa 18 % fijo: **deuda conocida** (Doc. 08 §11.1). Se corrige con afectación por producto |
| Afectación IGV por producto (gravado / exonerado / inafecto) | `productos.tipo_afectacion_igv_id` ya existe; se leerá al armar la venta y llenará `op_exonerada` y `op_inafecta` |
| Boleta ≥ S/ 700 exige identificar al cliente | Regla de validación en `IssueReceipt`; hoy fuera de alcance |
| Emisión asíncrona (cola), reintentos, `PENDIENTE_ENVIO → ENVIADO → ACEPTADO` | `IssueReceipt` pasa a crear el comprobante en `PENDIENTE_ENVIO` y encolar el envío; la API de cobro sigue devolviendo el número al instante |
| Notas de crédito/débito, comunicaciones de baja, resumen diario (`resumenes_sunat`) | Specs posteriores; `comprobante_relacionado_id` se agrega entonces |
| Certificado digital y credenciales SOL por empresa | Tablas ya existen (`certificados_digitales`, `empresas.usuario_sol`); falta la pantalla de carga y el cifrado |

### Reglas para quien integre Greenter

1. **Nunca** enviar a SUNAT un comprobante con `es_simulado = true`; al activar la integración, los simulados quedan como histórico sin envío.
2. El número ya entregado al cliente **no cambia**: la emisión real reutiliza serie y correlativo del comprobante creado en el cobro.
3. Un fallo de SUNAT no revierte ni bloquea la venta (AGENT.md): se reintenta por cola y se muestra el estado en la pantalla.
4. La pantalla y el JSON del comprobante son estables: solo se **suman** campos (`estado_sunat`, `hash`, etc.).

## Tareas

- [x] Migración `comprobantes` (única por venta; única por empresa + tipo + serie + correlativo; RLS)
- [x] `IssueReceipt` (serie, correlativo, tipo, cliente) en `Core/Billing`
- [x] Cobro emite el comprobante dentro de su transacción y lo devuelve
- [x] `GET /comprobantes` y `GET /comprobantes/{id}`
- [x] Pruebas (`ReceiptTest`, 5 casos): boleta, factura con RUC, cliente inválido sin cobrar, cuenta dividida y lista del turno, mozo sin permiso
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-12)

- Código: `Core/Billing/{Application/IssueReceipt, Infrastructure/Persistence/Receipt, Presentation/{ReceiptPresenter, Controllers/ReceiptController, routes}}`, migración `2026_10_12_000400_create_comprobantes`, enganche en `Modules/Restaurant/Application/ChargeOrder`.
- Suite: 119 en verde; los 8 que fallan son de RLS y ya fallaban antes (`DB_USERNAME=postgres` en `.env`).
