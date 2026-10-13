# 021 — Carrito del mozo: repetidos que suman y observación en cada plato

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (ajustes pedidos por el negocio)
**Documentos:** specs 006 y 020

## Qué y por qué

El flujo real de un restaurante es: **agregar, agregar y enviar al final**. El carrito ya acumulaba sin esperar al servidor y «Enviar a cocina» manda la tanda completa, repartida sola a Cocina o Bar según la estación de cada plato. Esta spec cierra los dos huecos que faltaban para que sea redondo:

1. **El plato repetido suma.** Tocar dos veces el mismo plato con las mismas opciones **y la misma observación** suma cantidad en una sola línea. Antes, un plato con observación repetido creaba líneas duplicadas (la comparación exigía nota vacía).
2. **Observación en todos los platos.** Solo los platos con opciones tenían caja de nota (dentro de su hoja de modificadores). Ahora **cualquier** línea del carrito puede llevar su observación («sin hielo», «sin arroz»…) editándola ahí mismo, antes de enviar.

## Criterios de aceptación

- [x] Dos toques sobre el mismo plato (mismas opciones, misma nota) = una línea con cantidad 2.
- [x] El mismo plato con notas distintas = dos líneas, cada una con lo suyo.
- [x] Cualquier plato del carrito —con o sin opciones— puede recibir, editar o quitar su observación antes de enviar.
- [x] La observación viaja en el envío como `notas` y se ve en «Enviados» y en la comanda de la estación.
- [x] El envío sigue siendo uno solo, con una comanda por estación, verificable en la base.
- [x] Con un envío en curso (clave pendiente) la línea no se puede editar: el carrito manda.
- [x] En el celular se edita igual, desde la pestaña Pedido.

## Fuera de alcance

- Chips de observaciones rápidas predefinidas por categoría («sin hielo», «sin cebolla»).
- Editar la nota de un plato ya enviado (se anula con motivo y se vuelve a enviar).
- Unir líneas con notas distintas.

## Cierre (2026-10-13)

- Frontend: `cart-store.addLine` suma cuando coinciden plato + opciones + observación (se quitó la exigencia de nota vacía); `CartRow` permite escribir, editar o quitar la observación en cualquier línea («+ Observación» / «“…” · editar»; input con «Listo»/«No», Enter y Escape; bloqueada mientras hay un envío en curso). Backend sin cambios: `notas` ya viajaba en el contrato 006.
- E2E con navegador real (demo): mesa M4; dos toques a «Inca Kola 500 ml» → **una línea con cantidad 2**; observación «sin hielo» guardada desde el carrito; «Causa limeña» agregada; un solo «Enviar a cocina» creó **dos comandas**: #4 → **Bar** (la bebida, cantidad 2.000 y `notas = sin hielo`) y #5 → **Cocina** (la causa). Verificado en PostgreSQL.
- `npx tsc --noEmit`, `npm run lint` y `check_ui.py` sin errores ni advertencias nuevas.
- Limpieza (reportada): el pedido de prueba 16 se borró completo (detalles, comandas y su fila de mesa); la demo quedó con su único pedido de ejemplo (M1).
