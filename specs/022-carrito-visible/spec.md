# 022 — El carrito a la vista: detalles ordenados y enviar al final

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (ajustes pedidos por el negocio)
**Documentos:** specs 006 y 021

## Qué y por qué

Al probar el flujo, el negocio no encontraba el carrito: en pantallas grandes vivía en una columna lateral que no se leía como carrito, y en ventanas angostas quedaba escondido en la pestaña «Pedido». También faltaba el detalle ordenado por línea (cuánto vale cada cosa) antes de enviar.

Esta spec hace visible y explícito el paso intermedio: **el carrito al costado, con sus detalles ordenados, y recién al final el botón de enviar**.

1. **Visible desde 768px:** la columna del carrito acompaña la carta en tablet y laptop (antes aparecía recién a 1024px), pegada (sticky) mientras se navega el menú.
2. **Se llama «Carrito»** y muestra el contador de platos y el total; vacío dice claramente qué hacer.
3. **Cada línea ordenada:** nombre, opciones, observación, cantidad y **su subtotal** (cantidad × precio con adicionales).
4. **El botón final es «Enviar pedido»** (antes «Enviar a cocina»): revisa, marca y envía; cada estación recibe lo suyo.

## Criterios de aceptación

- [x] En tablet/laptop (≥ 768px) el carrito se ve al costado de la carta y queda pegado mientras se hace scroll.
- [x] El panel se titula «Carrito» con «N platos · S/ total»; el estado vacío dice «Tu carrito está vacío…».
- [x] Cada línea muestra su subtotal en `tabular-nums`, además de nombre, opciones y observación.
- [x] El botón final dice «Enviar pedido»; al enviar, el aviso dice «Pedido enviado.».
- [x] En celular se mantiene la pestaña «Pedido» y la barra inferior «Ver carrito · N platos · S/ …».
- [x] El resto del flujo (suma de repetidos, observaciones, comandas por estación) no cambia.

## Fuera de alcance

- Dividir la cuenta o enviar por partes.
- Carrito compartido entre meseros.
- Pedidos por QR.

## Cierre (2026-10-13)

- Frontend: `order-view.tsx` — dos columnas desde `md` (carta + carrito `sticky`, 340px en `md` y 400px en `lg`), `CartPanel` «Carrito» con «N platos · S/ total» y estado vacío claro, subtotal por línea (`lineSubtotal`), botón «Enviar pedido» y aviso «Pedido enviado.»; las pestañas y la barra inferior del celular se movieron a `md` para no solaparse con la columna nueva.
- E2E con navegador real (demo): mesa M5, «Causa limeña» + «Inca Kola 500 ml» ×2 → el carrito mostró **3 platos · S/ 36.00**, con cada línea ordenada (Causa **S/ 22.00**; Inca Kola ×2 **S/ 14.00**) y el botón «Enviar pedido» al final; al quitar las dos líneas y salir, el pedido se anuló solo (regla de la spec 020). Captura revisada.
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): el pedido de prueba 19 se borró; la demo quedó con su único pedido de ejemplo (M1).
