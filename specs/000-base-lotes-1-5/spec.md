# 000 — Base: lotes 1 a 5

**Estado:** ✅ Cerrada (2026-10-04, commit `de7f866`)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** previo al Doc. 09
**Documentos:** Doc. 01, 03, 06, 07 §3, Doc. 08 §13 lotes 1-5 y §15

Registro retroactivo de lo que ya existía antes de trabajar por specs.

## Qué se entregó

- Arquitectura Core / Modules / Platform / Shared con capas y `ArchitectureTest`.
- Multi-tenant por subdominio con RLS y roles `softflyer_owner` / `softflyer_app`.
- Login con Sanctum, bloqueo por intentos y formato de error estándar.
- Tablas de los lotes 1 a 5: catálogos SUNAT, planes, suscripciones, empresas, sucursales, certificados, series, roles y permisos, carta, salones y mesas.
- Prueba gratis de 7 días, modos DEMO / PRUEBA / PAGO.
- Backoffice de la plataforma.

## Pendientes conocidos (no se arrastran en silencio)

- Lotes 4 y 5 tienen tablas pero no API ni pantallas → specs de carta y plano (H0).
- MFA obligatorio para Administrador (Doc. 06 §4), recuperación de contraseña y lista de sesiones → spec propia, por definir.
- React Query y Zod (Doc. 01 §6) → se instalan en la spec de la pantalla de carta.
- Docker y CI → Doc. 10 (Infraestructura).
