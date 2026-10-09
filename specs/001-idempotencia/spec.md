# 001 — Idempotencia en escrituras críticas

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ➖
**Hito:** H0 (Doc. 09 §2)
**Documentos:** Doc. 07 §5, Doc. 08 §12

## Qué y por qué

El mozo envía comandas y el cajero cobra desde redes inestables. Si la conexión se corta después de enviar pero antes de recibir la respuesta, el cliente reintenta y la operación se ejecuta dos veces: dos comandas en cocina, dos cobros o dos comprobantes con correlativos distintos.

Con una `Idempotency-Key` por intento, el reintento devuelve la respuesta guardada sin volver a ejecutar nada. Se construye ahora, antes de los endpoints que la usarán (comandas, ventas, pagos y comprobantes), para que nazcan protegidos.

## Criterios de aceptación

- [x] Existe la tabla `claves_idempotencia` con RLS por inquilino.
- [x] Un middleware `idempotente` se puede aplicar a cualquier ruta.
- [x] Sin header `Idempotency-Key` en una ruta protegida → 400 `IDEMPOTENCIA_REQUERIDA`.
- [x] Clave con formato no UUID → 422 `VALIDACION`.
- [x] Misma clave, mismo inquilino y mismo endpoint → no se vuelve a ejecutar; devuelve el mismo cuerpo y el mismo código HTTP.
- [x] Misma clave reutilizada con un cuerpo distinto → 409 `IDEMPOTENCIA_CONFLICTO`.
- [x] Dos requests simultáneas con la misma clave → solo una se ejecuta; la otra recibe 409 `IDEMPOTENCIA_EN_PROCESO`.
- [x] La misma clave en otro inquilino no colisiona.
- [x] Las respuestas 5xx no se guardan (el cliente puede reintentar).

## Decisiones

- Se guarda también un hash del cuerpo (`hash_solicitud`) para detectar una clave reutilizada con otra operación. Es una columna extra respecto al Doc. 07 §5.
- `UNIQUE (inquilino_id, endpoint, clave)`: la base garantiza que dos requests simultáneas no ejecuten la operación dos veces.
- Las claves vencen a las 24 h; un comando programado borra las vencidas.
- Vive en `Core/Tenancy` (Infrastructure + middleware en Presentation) porque depende del inquilino resuelto; `Shared` no debe depender del Core.

## Fuera de alcance

- Aplicarla a endpoints concretos: cada spec de comandas, ventas, pagos y comprobantes la activa en sus rutas.

## Cierre

- Código: migración y modelo en `app/Core/Tenancy/Infrastructure`, middleware `EnsureIdempotency` (alias `idempotente`), comando `softflyer:limpiar-idempotencia` cada hora en `routes/console.php`.
- Pruebas: `tests/Feature/Tenancy/IdempotencyTest.php` (8 casos). Suite completa: 52 en verde como `softflyer_app`.
- La concurrencia se prueba simulando la clave ya reservada; la garantía real es el `UNIQUE` + `INSERT ... ON CONFLICT DO NOTHING`. La prueba con requests paralelas reales queda en la prueba de carga (Doc. 09 §5.2).
- Uso en una ruta: `->middleware(['inquilino', 'auth:sanctum', 'idempotente'])`, siempre después de `inquilino` y de la autenticación.
