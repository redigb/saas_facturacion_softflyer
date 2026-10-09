# 005 — Tiempo real con Reverb

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H0 (Doc. 09 §2) — cierra H0
**Documentos:** Doc. 05 §5 (Reverb), Doc. 08 §8 (canales), Doc. 09 §3-5 (reactividad, capacidad y pruebas)

## Qué y por qué

El objetivo n.º 1 del cliente es que los pedidos lleguen a cocina al instante. Eso exige un canal en tiempo real entre servidor y dispositivos (WebSocket), seguro entre restaurantes y entre sucursales, que no se caiga ni frene una venta si falla.

Esta spec deja ese canal funcionando de punta a punta **antes** de los pedidos, con dos eventos reales que ya sirven hoy:
- **PlanoActualizado:** si el encargado guarda el plano, la otra persona que lo tiene abierto se entera al instante (evita el 409 sorpresa).
- **CartaActualizada:** si el dueño cambia un precio o agota un plato, todas las pantallas abiertas lo ven sin recargar (en H1, el celular del mozo).

## Criterios de aceptación

- [x] Reverb corre como servidor de WebSockets de la API (local y documentado para producción).
- [x] Existen los canales privados del Doc. 08 §8: `sucursal.{id}.salon`, `sucursal.{id}.estacion.{id}` y `sucursal.{id}.mozo.{usuario}`.
- [x] Nadie se suscribe a un canal de otro restaurante, de una sucursal donde no trabaja ni al canal personal de otro mozo.
- [x] Guardar el plano o cambiar la carta avisa al instante a las demás pantallas abiertas, que se actualizan solas.
- [x] Si Reverb está caído, guardar el plano o la carta sigue funcionando (el aviso se pierde, el dato no).
- [x] Al reconectarse, el dispositivo vuelve a pedir el estado (un mensaje perdido nunca es un dato perdido).
- [x] El usuario ve si está "en vivo" o "reconectando".
- [x] Hay un script de prueba de carga (Doc. 09 §5.2) y una medición local de latencia.

## Fuera de alcance

- Eventos de pedidos y comandas (`ComandaEnviada`, `PlatoListo`…): llegan con H1.
- Varias instancias de Reverb con Redis (Doc. 09 §4.2): se configura al escalar.
- Ejecutar la prueba de carga completa de 5 000 conexiones: necesita el servidor de staging (Doc. 10).
