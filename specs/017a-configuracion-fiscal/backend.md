# 017a — Backend

## Contrato

Base `/api/v1`, subdominio del inquilino. Permiso de configuración de empresa.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/configuracion-fiscal` | 200 estado: certificado (titular, vence_en, vigente), usuario SOL, `homologado`, entorno efectivo |
| POST | `/configuracion-fiscal/certificado` | 200; recibe archivo `.pfx`/`.p12` (multipart) y contraseña |
| PUT | `/configuracion-fiscal/credenciales-sol` | 200; usuario y clave SOL |
| GET | `/tasas-igv` | 200 tasas con vigencia |
| PUT | `/configuracion-fiscal/tasa-igv` | 200; elige la tasa vigente de la empresa |

Afectación por producto: ya existe en la carta (`tipo_afectacion_igv_id` en `PATCH /productos/{id}`, gravado por defecto); el panel de configuración solo necesita exponer el selector.

Backoffice: `GET /plataforma/clientes/{slug}` suma el bloque `fiscal` (sin secretos) y `POST /plataforma/clientes/{slug}/homologacion` `{homologado}` activa o quita la homologación, con bitácora `HOMOLOGACION_ACTUALIZADA`.

### Errores propios

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 422 | `CERTIFICADO_INVALIDO` | Archivo ilegible o contraseña incorrecta |
| 422 | `CERTIFICADO_VENCIDO` | Fecha de vencimiento pasada |

## Decisiones

- **Formatos del certificado:** se acepta PEM (clave privada y certificado en el mismo archivo) o `.pfx`/`.p12`. En la práctica el PEM da menos errores; el PFX sigue disponible.
- **IGV por local:** `sucursales.opera_con_igv` (verdadero por defecto) dice si el local opera con IGV; se apaga solo en zonas exoneradas. La afectación por producto queda como excepción dentro de un local que sí opera con IGV. El cálculo final de cada comprobante lo aplica la 017b: un local sin IGV emite exonerado sin importar el producto. Cualquier excepción de tasa debe validarla un contador.
- **Bloqueo de la configuración fiscal:** `empresas.config_fiscal_bloqueada`. Lo activa o desactiva solo el backoffice (`POST /plataforma/clientes/{slug}/bloqueo-fiscal` `{bloqueada}`, bitácora `BLOQUEO_FISCAL_ACTUALIZADO`). Con el bloqueo, el certificado, la clave SOL, la tasa, el IGV del local y la afectación de un producto responden `403 CONFIG_FISCAL_BLOQUEADA`, aunque sea el administrador. La lectura y todo lo no fiscal (precio, nombre de la sucursal) siguen abiertos. Motivo: el dueño no necesita tocar esta parte y un cambio accidental dejaría de emitir.
- **Quién administra la facturación:** Softflyer, desde el backoffice. Los clientes nuevos nacen con `config_fiscal_bloqueada = true` (los existentes conservan su estado) y el backoffice carga por ellos, aun con el bloqueo puesto:
  - `POST /plataforma/clientes/{slug}/fiscal/certificado` (multipart; bitácora `CERTIFICADO_CARGADO`)
  - `PUT /plataforma/clientes/{slug}/fiscal/credenciales-sol` (bitácora `CREDENCIALES_SOL_ACTUALIZADAS`; la clave nunca se registra)
  - `PATCH /plataforma/clientes/{slug}/fiscal/sucursales/{id}` `{opera_con_igv}` (bitácora `IGV_LOCAL_ACTUALIZADO`)
  El detalle del cliente suma `sucursales_detalle`. `ManageFiscalConfiguration::asPlatform()` es la única forma de saltarse el bloqueo.
- **Pendiente:** elegir la tasa de IGV y la afectación por producto desde el backoffice. Mientras tanto, solo hay tasa general y gravado por defecto; si hiciera falta cambiarlos, se desbloquea un momento.
- El `.pfx` se convierte a PEM **una sola vez** al subirlo y se guarda cifrado en `certificados_digitales` (ya existe, un activo por empresa). No se conserva el `.pfx` ni su contraseña.
- La clave SOL se guarda con el cifrado de aplicación de Laravel; nunca se devuelve ni se escribe en logs.
- `empresas.homologado` (boolean, falso por defecto) lo activa solo el backoffice.
- Nueva tabla `tasas_igv` (vigencia desde/hasta, porcentaje) sembrada con 18 %; productos con `afectacion_igv` por defecto gravado.
- OpenSSL en Windows necesita `openssl.cnf` en el entorno de desarrollo local para pruebas con certificados; no afecta a producción.

## Tareas

- [x] `greenter/lite` ^5.3 instalado y verificado (firma de XML de boleta).
- [x] Migración `2026_10_19_000100`: `empresas.tasa_igv_id`, `certificados_digitales.titular`, acción de bitácora. (`homologado`, SOL, `tasas_igv` y afectación por producto ya existían.)
- [x] `ManageFiscalConfiguration`: importa `.pfx`/PEM, cifra, valida vencimiento.
- [x] Endpoints bajo `configuracion.empresa`.
- [x] Bloque fiscal y homologación en el backoffice.
- [x] Migración `2026_10_19_000200`: `empresas.config_fiscal_bloqueada`, `sucursales.opera_con_igv`, acción de bitácora.
- [x] Bloqueo en certificado, SOL, tasa, afectación de producto e IGV del local; endpoint del backoffice.
- [x] Migración `2026_10_19_000300`: bloqueo por defecto para clientes nuevos y acciones de bitácora.
- [x] Backoffice carga certificado, SOL e IGV por local.
- [x] Pruebas en verde (146): secretos cifrados y ausentes de las respuestas, bloqueo y IGV por local.
- [x] Frontend: ver `frontend.md`.
