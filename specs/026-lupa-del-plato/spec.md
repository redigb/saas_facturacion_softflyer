# 026 — Lupa del plato: foto en grande para mostrar al cliente

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (mejora pedida por el negocio)
**Documentos:** specs 006 y 023

## Qué y por qué

Cuando el mozo (o el admin) toma un pedido, a veces el cliente pregunta *"¿cómo es ese plato?"*. Hoy la tarjeta muestra la foto en miniatura, pero no hay forma de verla bien. Esta spec agrega una **lupa** sobre las tarjetas de platos que tienen foto: un toque y la **foto se abre en un modal grande** con el nombre y el precio — pensado para girar la tablet/celular hacia el cliente.

Reglas:
- La lupa **solo aparece si el plato tiene foto** (spec 023); los platos sin foto se ven igual que siempre.
- Es un control **aparte**: tocarla **no agrega** el plato al carrito (el resto de la tarjeta sigue agregando con normalidad).
- Aplica para **ambos roles** (mozo y admin): es la misma pantalla de pedido.
- El modal se cierra con la X, tocando fuera o con Escape; en celular entra desde abajo, en tablet/PC centrado.

## Criterios de aceptación

- [x] Las tarjetas con foto muestran una lupa (ícono de búsqueda) en la esquina de la imagen.
- [x] Tocar la lupa abre un modal grande con la foto completa (sin recortes), nombre del plato, precio y descripción si la tiene.
- [x] Tocar la lupa **no** agrega el plato al carrito; tocar el resto de la tarjeta sí (sin cambios).
- [x] El modal cierra con X, clic/tap fuera y tecla Escape.
- [x] Los platos sin foto no muestran lupa y nada más cambia.
- [x] Accesible: `aria-label` en la lupa y `role="dialog"` + `aria-modal` en el modal.

## Fuera de alcance

- Galería de varias fotos por plato.
- Zoom/pinch dentro del modal.
- Lupa en la pantalla Carta del admin (su lista ya muestra la foto como avatar).

## Cierre (2026-10-13)

- Frontend: lupa circular (40px, ícono de búsqueda) sobre la esquina de la foto en las tarjetas del menú de pedido, **hermana** del botón de agregar (sin botones anidados: su toque no agrega al carrito); solo aparece si el plato tiene foto. `PhotoModal`: modal `role="dialog"` con la foto completa (`object-contain`, hasta 70vh) + nombre, precio y descripción; cierre con X, toque fuera y Escape. Aplica a mozo y admin (misma pantalla).
- E2E con navegador real (demo, Rosa): tarjeta del Ceviche con foto → lupa visible y única (los platos sin foto no la muestran); al tocarla se abrió el modal con la imagen cargada y el **carrito siguió vacío**; Escape cerró el modal (capturas revisadas).
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): el pedido de prueba (27, M8) se auto-anuló al salir y se borró; la foto de prueba del Ceviche se eliminó (el plato quedó sin foto); la demo quedó con su pedido de ejemplo (M1).
