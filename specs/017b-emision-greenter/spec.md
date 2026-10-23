# 017b — Emisión con Greenter

**Estado:** En curso (2026-10-20) — backend de emisión listo y probado con SUNAT simulado; falta probar contra SUNAT beta real y el ticket con QR
**Backend:** 🟡 · **Frontend:** ⚪
**Documentos:** Doc. 04 §4–§6; Doc. 08 §11

## Qué y por qué

Convierte el cobro en un comprobante real: XML UBL 2.1 firmado, enviado a SUNAT beta por cola, con CDR guardado.

## Cómo funciona (hecho)

1. Al cobrar, `IssueReceipt` numera el comprobante dentro de la transacción del cobro. Si la empresa está **lista para emitir** (certificado vigente, usuario y clave SOL, RUC válido) nace `PENDIENTE_ENVIO` con `es_simulado = false` y se encola `SendReceiptJob` (después del commit). Si no, sigue siendo una simulación `EMITIDO` que **nunca** sale hacia SUNAT.
2. El detalle viaja con el comprobante en `detalle_comprobantes` (valor unitario sin IGV, precio con IGV, afectación, base, IGV), copiado de la venta: lo firmado no cambia aunque la carta cambie.
3. `SendReceiptJob` fija el inquilino, llama a `SubmitReceipt` y lo suelta. `SubmitReceipt` usa la interfaz `SunatGateway`; la implementación `GreenterGateway` arma **un `See` por envío** con el certificado y la clave SOL descifrados de esa empresa, firma el XML y lo manda a beta (o producción si la empresa está homologada y el despliegue es productivo).
4. Veredicto: `ACEPTADO`, `OBSERVADO` (CDR con notas) o `RECHAZADO` (error 2000 o más). Se guardan XML firmado y CDR en el disco privado (`comprobantes/{inquilino}/{ruc}-{tipo}-{serie}-{correlativo}`), el hash de la firma, el código y mensaje de SUNAT.
5. **Reintento automático, sin intervención.** `SubmitReceipt` nunca lanza por una falla de SUNAT: decide según lo que SUNAT contestó y deja en `proximo_intento_en` cuándo volver. El comando `softflyer:enviar-pendientes` (cada minuto, `schedule:run`) encola lo que ya toca y rescata lo que nunca salió (cola caída). Tras una caída de SUNAT todo envío espera 2 min (`sunat.pausa`) para no golpearla con cada pendiente.

   | SUNAT respondió | El comprobante |
   |---|---|
   | Aceptó / observó | `ACEPTADO` / `OBSERVADO` (final) |
   | Rechazó (2000 o más) | `RECHAZADO` (final, no se reintenta) |
   | No atendió (0100–1999, conexión) | `PENDIENTE_ENVIO` · `SUNAT_CAIDO`: reintenta con 30 s, 2 min, 10 min, 30 min y luego cada 1 h |
   | Corte con el envío en vuelo | `PENDIENTE_ENVIO` · `VERIFICAR`: antes de reenviar consulta el CDR |
   | 1033 (ya lo tiene) | `PENDIENTE_ENVIO` · `CDR_PENDIENTE`: consulta el CDR, nunca reenvía. Cada 1 min los primeros 10 min, cada 10 min hasta 1 h, cada 1 h hasta 24 h, cada 3 h hasta 48 h; luego `SIN_CDR` (final, con alerta) |
   | Credenciales (0101–0104, 0111) | `PENDIENTE_ENVIO` · `CREDENCIALES`: pausa sin reintentos; al guardar credenciales nuevas vuelve solo a la cola |
   | Pasaron 48 h sin poder informarlo (factura y boleta) | `VENCIDO` (final, con alerta). El plazo es una constante en `SubmitReceipt` |

   Todos los tiempos son constantes en `SubmitReceipt`. La consulta de CDR (`getStatusCdr`) solo existe en producción: en beta devuelve nulo.
6. **IGV por sucursal** (`BranchIgvPolicy`). La **tasa** es la de la sucursal; si no tiene, la de la empresa; si tampoco, 18 %. Una sucursal marcada `exonerado_amazonia` vende **exonerado (20) lo gravado (10)** y el comprobante lleva la **leyenda 2001** (bienes) o **2002** (servicios) según `leyenda_amazonia`; solo si hay algo exonerado, y queda fija en `comprobantes.leyenda_codigo`. Lo inafecto (30) y lo gratuito nunca cambian. `ventas` y `comprobantes` guardan `op_gravada`, `op_exonerada`, `op_inafecta`. Beta real: factura F001-3 exonerada con leyenda 2002, `ACEPTADO`.
7. Una **boleta de S/ 700 o más** sin documento del cliente se rechaza con 422 (`cliente.numero`) solo cuando la emisión es real.

## Panel del dueño

Solo lectura: ve el resumen (certificado, usuario SOL, tasa de IGV, si está lista para emitir). **Certificado, clave SOL, tasa de IGV (empresa y sucursal) y Amazonía son exclusivos del backoffice**: no existen endpoints del dueño para cambiarlos (la API de sucursales ignora esos campos), no hay "modo soporte" ni candado por empresa. Lo único fiscal que decide el dueño es la **afectación por producto**. Backoffice: `PUT plataforma/clientes/{slug}/fiscal/tasa-igv`, `PATCH .../fiscal/sucursales/{id}` (`tasa_igv_id` nulo hereda, `exonerado_amazonia`, `leyenda_amazonia`), cada cambio real queda en la bitácora (`TASA_IGV_ACTUALIZADA`, `AMAZONIA_LOCAL_ACTUALIZADA`). Al guardar la clave SOL se valida: 8 a 12 caracteres, sin espacios, usuario sin el RUC delante.

## Alcance pendiente

- [x] Alertas en el backoffice (`GET plataforma/alertas`, pantalla Alertas): `CREDENCIALES`, `SIN_CDR`, `VENCIDO` (urgentes), pendientes de más de 1 h y certificado vencido o a menos de 30 días. Solo comprobantes reales; los demo no se escanean. Cada alerta trae los 10 comprobantes más antiguos (número, tipo, total, intentos, último error), el menú muestra un contador y el listado se cachea 60 s. Pendiente de 017c: reenvío manual y filtros.
- [x] Botón "Probar credenciales" en la ficha del cliente (`POST plataforma/clientes/{slug}/fiscal/probar-credenciales`): consulta el CDR de un comprobante inexistente, 0011 = autenticación correcta. En beta responde `NO_VERIFICABLE`; el camino de producción (OK / RECHAZADAS) está probado solo con doble, confirmarlo con la primera empresa homologada.
- [ ] Verificar `getStatusCdr` y el 1033 contra SUNAT producción: en beta un reenvío se acepta de nuevo, así que esas rutas solo se probaron con un doble.
- [ ] El servidor debe correr `schedule:run` cada minuto además del worker de cola.
- [x] Quitados de la API del dueño los endpoints de certificado, SOL y tasa; el candado `config_fiscal_bloqueada` ya no existe (migración `2026_10_22_000100_igv_por_sucursal`), así que `demo` y `donjose` quedan igual que cualquier cliente.
- [x] Prueba real contra SUNAT beta (2026-10-20, empresa `demo`): boleta B001-1 y factura F001-2 `ACEPTADO` con su CDR. La primera factura (F001-1) fue rechazada con 3246 porque `PaymentTerms` iba sin tipo; corregido en el mapper.
- [ ] Tabla `clientes` ("CLIENTES VARIOS" y búsqueda por DNI/RUC); hoy el cliente va dentro del comprobante.
- [ ] Ticket con código QR.
- [ ] Frontend del cajero: pedir DNI/nombre al cobrar y mostrar el error de S/ 700 (el campo `cliente` ya existe en el cobro).
- [ ] Probar el worker real (`php artisan queue:work`) fuera de las pruebas, que usan cola síncrona.

## Criterios de aceptación

- [x] El cajero recibe el número al instante; el envío ocurre después (el Job se encola tras el commit).
- [x] Una boleta y una factura de prueba quedan `ACEPTADO` en SUNAT beta con su CDR.
- [x] Si SUNAT no responde, el comprobante queda `PENDIENTE_ENVIO` y se reintenta solo.
- [x] Los simulados no se envían nunca.

## Pruebas

`tests/Feature/Restaurant/EmissionTest.php` (SUNAT reemplazado por un doble) y `tests/Unit/AmountInWordsTest.php`: aceptada, simulada sin salir, SUNAT caído y reintento, rechazada y observada, local sin IGV y producto inafecto, boleta de S/ 700, y que el mapper produce un XML firmable por Greenter. Reintentos: SUNAT caído y barrendero, corte ambiguo, 1033 y CDR, ventana de 48 h, credenciales, plazo vencido y rescate de Jobs perdidos. IGV por sucursal: Amazonía con leyenda y lo inafecto intacto, tasa de sucursal sobre la de empresa, y que el dueño no tiene cómo cambiar lo fiscal. Suite completa: 162 en verde. Beta real: boleta, factura y factura exonerada con leyenda 2002, todas `ACEPTADO`.

## Fuera de alcance

- Interfaz de estados y reenvío (017c).
