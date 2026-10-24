# 018 — Frontend

Sigue el skill `softflyer-ui` (tokens oficiales, toque mínimo de 44px, `tabular-nums` en cifras, sin diálogos nativos).

## Para quién y dónde

**El mozo y el dueño**, en la tablet del salón o la PC del mostrador, en plena hora punta. El plano es el mismo que el dueño dibujó: sus mesas, su barra, sus puertas. Debe leerse de un vistazo quién está libre y quién no, y abrir una mesa debe costar un solo toque.

## Flujo

1. En `/panel/pedidos`, arriba, el conmutador **Plano | Mesas**.
2. **Plano** (predeterminado en tablet/PC): por cada salón se dibuja el plano tal como está en «Plano del salón», con las mesas pintadas por estado y el `#pedido` sobre las ocupadas.
3. Tocar una **mesa libre** → abre el pedido y entra a la pantalla del pedido (igual que hoy).
4. Tocar una **mesa ocupada o por cobrar** → entra directo a su cuenta.
5. Tocar una **mesa bloqueada** → no pasa nada (no es operable).
6. **Mesas** (predeterminado en celular): las tarjetas de hoy, con filtros por estado y buscador por código.
7. Los colores cambian solos en tiempo real cuando otro mozo abre, envía o pide la cuenta.

## Experiencia

| Tema | Decisión |
|---|---|
| Colores de estado | Libre: blanco con borde azul · Ocupada: azul relleno · Por cobrar: ámbar relleno · Bloqueada: gris. Es la misma semántica del resto de la app y el editor del plano queda alineado a ella |
| Info en la mesa | Código grande; si hay pedido, la cápsula muestra `#número` en lugar de la capacidad |
| Leyenda | Fila de puntos con nombre bajo la barra de control, solo en modo Plano |
| Errores de acción | El toast de siempre; si otro mozo se adelantó (409), se entra a su pedido (spec 006) |
| Cargando | Esqueleto del lienzo por salón |
| Vacío | Salón sin mesas dibujadas: aviso con enlace a «Plano del salón» |
| Plano con error | Aviso por salón, el resto de la pantalla sigue usable |
| Celular | Por defecto tarjetas; el conmutador deja ver el plano en solo lectura. El lienzo no bloquea el scroll táctil (no hay gestos de edición) |
| Accesibilidad | Conmutador con `aria-pressed` y etiqueta de grupo; en modo Plano cada mesa es un botón enfocable (Enter/Espacio) con etiqueta «Mesa M1»; leyenda con texto, no solo color |
| Edición | Prohibida desde Pedidos: el lienzo se reutiliza apagado (`editable={false}`), sin paleta ni tiradores |

## Tareas

- [x] Conmutador Plano | Mesas con predeterminado por pantalla
- [x] Vista Plano por salón con `FloorCanvas` en solo lectura y estados derivados de los pedidos
- [x] Cápsula `#pedido` en mesas ocupadas y por cobrar
- [x] Leyenda de colores, aviso de salón vacío y error de plano
- [x] Refresco en vivo (`PedidoActualizado`, `PlanoActualizado`)
- [x] Paleta del editor alineada (ocupada = azul relleno, por cobrar = ámbar relleno)
- [x] `npm run lint`, `npx tsc --noEmit` y `check_ui.py` sin advertencias nuevas

## Cierre (2026-10-13)

Ver el detalle y la evidencia E2E en [`spec.md`](spec.md#cierre-2026-10-13).
