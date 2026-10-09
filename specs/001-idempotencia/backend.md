# 001 — Backend

- [x] Migración `claves_idempotencia` con RLS y `UNIQUE (inquilino_id, endpoint, clave)`
- [x] Modelo con `BelongsToTenant`
- [x] Middleware `idempotente` (reservar clave → ejecutar → guardar respuesta)
- [x] Errores `IDEMPOTENCIA_REQUERIDA`, `IDEMPOTENCIA_CONFLICTO`, `IDEMPOTENCIA_EN_PROCESO`
- [x] Comando programado que borra claves de más de 24 h
- [x] Pruebas: repetición, cuerpo distinto, concurrencia, aislamiento entre inquilinos, 5xx no guardado
- [x] Pruebas en verde (`php artisan test`)
- [x] Cerrar spec y marcarla en el índice
