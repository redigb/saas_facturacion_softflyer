# 008 — Tiempo real eficiente

**Estado:** ✅ Cerrada (2026-10-12)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (Doc. 09 §3 y §4.2) — endurece la reactividad antes de H2
**Documentos:** Doc. 09 §3.5 (el WebSocket no es la fuente de verdad), §4.2 (`/broadcasting/auth` liviano)

## Qué y por qué

Al abrir el panel la conexión se siente pesada: cada canal privado pide su propia autorización (`2N` peticiones por usuario con N sucursales, más estaciones en cocina) y cada cambio de un pedido hace que **todos** los dispositivos vuelvan a pedir la lista completa de pedidos **y todos los planos de salón**, aunque un pedido no cambia el plano. Esta spec reduce ese trabajo sin cambiar lo que ve el usuario ni la infraestructura.

## Criterios de aceptación

- [x] Al abrir el panel, todos los canales de un usuario se autorizan con **una sola petición**.
- [x] Autorizar un canal ajeno o inexistente sigue dando acceso denegado; los demás canales del lote se autorizan.
- [x] Un cambio de pedido de otro mozo actualiza el salón en menos de 1 s, con **una** petición (el pedido) y sin recargar la lista completa ni los planos.
- [x] Un pedido cerrado o anulado desaparece del salón sin pedir nada.
- [x] Un evento ya conocido (misma `version` o menor) no genera ninguna petición.
- [x] Una mesa sin pedido activo aparece libre aunque el plano guardado en caché diga otra cosa.

## Fuera de alcance

- Conexión perezosa por pantalla, reconexión escalonada y publicación tras la respuesta (puntos 3–5 del análisis): quedan para una spec posterior.
- Cambios de infraestructura de Reverb (Redis, `ext-uv`): no hacen falta con la carga actual (Doc. 09 §4.1).
