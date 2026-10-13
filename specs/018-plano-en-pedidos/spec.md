# 018 — Ver el salón en el plano (Pedidos)

**Estado:** ✅ Cerrada (2026-10-13)
**Backend:** ➖ · **Frontend:** ✅
**Hito:** H1 (mejora de la pantalla del mozo)
**Documentos:** Doc. 08 §7 (salón y plano), Doc. 08 §8 (pedidos); specs 003 y 006

## Qué y por qué

En la pantalla **Pedidos** el mozo veía las mesas como tarjetas agrupadas por salón. El dueño ya dibujó su local en **Plano del salón** (spec 003) — mesas con su forma y tamaño, la barra, puertas, la caja — y esa forma real del local no se aprovechaba al operar.

Esta spec agrega la vista **Plano** dentro de Pedidos: el salón se dibuja tal como el dueño lo dibujó, con cada mesa pintada según su estado en vivo (libre, ocupada, por cobrar, bloqueada), la barra y los demás elementos a la vista para ubicarse de un vistazo, y el número de pedido sobre cada mesa ocupada. Tocar una mesa libre abre su pedido; tocar una ocupada entra a su cuenta. Sin permisos nuevos: son las mismas operaciones de la spec 006 sobre otro lienzo.

## Criterios de aceptación

- [x] Pedidos tiene un conmutador **Plano | Mesas**; en tablet/PC el predeterminado es el plano y en celular las tarjetas, y se puede cambiar en el momento.
- [x] El plano se ve igual al del editor (mesas con forma, tamaño, rotación y sillas; barra y elementos) y se adapta al ancho de la pantalla.
- [x] Cada mesa se pinta según su estado en vivo con los colores de la app: libre, ocupada (azul relleno), por cobrar (ámbar relleno) y bloqueada (gris).
- [x] Una mesa con pedido muestra su `#número`; al tocarla se entra a su cuenta, y una mesa libre abre el pedido en un toque (spec 006). Una mesa bloqueada no abre nada.
- [x] Los colores cambian solos cuando otro mozo abre, envía o pide la cuenta (`PedidoActualizado`, spec 005) y el dibujo se refresca si el dueño guarda el plano (`PlanoActualizado`).
- [x] En modo Plano hay una leyenda de colores; los filtros por estado y el buscador siguen disponibles en modo Mesas.
- [x] Un salón sin mesas dibujadas o un plano que no carga muestran un aviso claro, nunca un lienzo vacío.
- [x] Desde Pedidos el plano es solo lectura: no se puede mover, redimensionar ni editar nada.

## Fuera de alcance

- Editar el plano desde Pedidos: eso sigue siendo la pantalla **Plano del salón** (spec 003).
- Asientos de barra como objetos operables: la barra es referencia visual, igual que en el editor.
- Unir y mover mesas, dividir cuenta, zoom del lienzo.
- Recordar la vista preferida entre sesiones.

## Cierre (2026-10-13)

- Código: `src/app/panel/pedidos/salon-floor.tsx` (nuevo: el plano en solo lectura con los estados derivados de los pedidos), `salon-view.tsx` (conmutador Plano | Mesas, leyenda, refresco con `PlanoActualizado`), `plano/floor-canvas.tsx` (capa `overlays`, clic de mesa en solo lectura, mesas como botón enfocable con etiqueta, scroll táctil ya no bloqueado) y `plano/floor-shapes.tsx` (cápsula `#pedido`; ocupada = azul relleno y por cobrar = ámbar relleno, igual que las tarjetas del panel).
- Estado operativo: lo manda el pedido activo (spec 006); `mesas.estado` solo aporta `BLOQUEADA`. Los colores se actualizan con los mismos avisos en vivo que ya usaban las tarjetas.
- E2E en la demo (servidores reales, navegador real): entrar sin contraseña; `/panel/pedidos` dibuja el salón del dueño (barra, caja, M9 de 8, Terraza con T1–T4); M1 (con pedido del seeder) se pinta azul con `#1`; tocar M1 entra a su cuenta; tocar M2 abre un pedido nuevo y al volver M2 aparece azul con `#2`; **Anular pedido** la devuelve a libre. Verificado también en PostgreSQL.
- `npx tsc --noEmit`, `npm run lint` y la suite del backend (135 en verde) sin errores. `check_ui.py`: sin advertencias nuevas (las 93 existentes son previas, del SVG del plano y del editor, que usan hex por necesidad).
- Datos de prueba: el pedido que abrí para la prueba (M2) se anuló y se borró. Los pedidos previos de la demo (el del seeder en M1 y otro de una mesa de otra sucursal) no se tocaron.
