# 002 — Carta del restaurante

**Estado:** Abierta
**Backend:** ✅ · **Frontend:** 🟡
**Hito:** H0 (Doc. 09 §2)
**Documentos:** Doc. 08 §5 (carta), Doc. 06 §5 (permisos `productos.*`), Doc. 07 §3-4 (formato y paginación)

## Qué y por qué

Sin carta no hay pedidos. Las tablas existen desde el lote 4, pero el dueño no tiene cómo cargar sus platos: hoy solo la demo tiene carta, y vino de un seeder.

Esta spec le da al dueño una pantalla para armar su carta (categorías, platos y bebidas con precio, a qué estación de cocina va cada uno y sus modificadores como "término de la carne") y deja lista la **carta completa en un solo endpoint**, que el mozo descargará una vez en su celular en H1 para tomar pedidos sin latencia.

## Criterios de aceptación

- [ ] El dueño crea, edita, ordena y desactiva categorías.
- [ ] El dueño crea un plato con nombre, precio y categoría en menos de 30 segundos, sin conocer códigos SUNAT (los valores tributarios tienen un valor por defecto correcto).
- [ ] Un producto desactivado deja de aparecer en la carta del mozo, sin perder su historial.
- [ ] El dueño define estaciones (Cocina, Bar…) y cada plato sabe a cuál va (por su categoría o de forma puntual).
- [ ] El dueño crea grupos de modificadores con mínimo y máximo de selección y los asigna a productos.
- [ ] `GET /carta` devuelve todo lo vendible en una sola respuesta, lista para guardarse en el dispositivo.
- [ ] Un usuario sin permiso `productos.*` ve la carta pero no puede modificarla.
- [ ] La carta de un restaurante nunca es visible desde otro (RLS).

## Fuera de alcance

- Imágenes de productos (se agregan en una spec propia, con almacenamiento de archivos).
- Insumos y recetas (H4b): aquí solo se manejan `PLATO` y `BEBIDA`.
- Precios por sucursal y combos (fuera de la Fase 1, Doc. 08 §1).
- Evento en tiempo real `CartaActualizada`: llega con la spec de Reverb.
