# 003 — Editor del plano del salón

**Estado:** ✅ Cerrada (2026-10-08)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H0 (Doc. 09 §2)
**Documentos:** Doc. 08 §7 (salón y plano), Doc. 06 §5 (permiso `restaurante.plano.editar`), Doc. 07 §3 (formato)

## Qué y por qué

Los pedidos de H1 se toman sobre una mesa: el mozo toca "M4" en el plano y empieza a cargar platos. Hoy las tablas `salones`, `mesas` y `elementos_plano` existen, pero solo la demo tiene un plano (vino de un seeder).

Esta spec le da al dueño un editor para dibujar su local como es: uno o varios salones (Salón principal, Terraza, 2.º piso), mesas que arrastra y redimensiona, y elementos de referencia (barra, puertas, caja, baños) para que el mozo se ubique de un vistazo. El mismo plano se ve igual en la PC del cajero y en el celular del mozo porque se guarda en unidades de lienzo, no en píxeles.

## Criterios de aceptación

- [x] El dueño crea, renombra, ordena y desactiva salones.
- [x] Agrega mesas (cuadrada, redonda, rectangular) y elementos desde una barra de herramientas, los arrastra, cambia tamaño y rota.
- [x] Cada mesa tiene un código único en su salón ("M1") y una capacidad.
- [x] Guardar es una sola operación: o se guarda todo el plano o nada.
- [x] Si otra persona guardó antes, el segundo recibe un aviso claro y no pisa el trabajo del primero.
- [x] Una mesa que se quita del plano no se borra (tendrá historial de pedidos): se desactiva, y si se vuelve a crear con el mismo código se reactiva.
- [x] No se puede quitar una mesa que está ocupada o por cobrar.
- [x] Cualquier usuario del restaurante ve el plano; solo quien tiene `restaurante.plano.editar` lo modifica.
- [x] El plano de un restaurante nunca es visible desde otro (RLS).

## Fuera de alcance

- Unir y mover mesas en pleno servicio (`restaurante.mesas.gestionar`): es operación de H1.
- Evento en tiempo real `PlanoActualizado`: llega con la spec de Reverb.
- Varias sucursales en la interfaz: el editor trabaja sobre la sucursal principal; la API ya acepta `sucursal_id`.
