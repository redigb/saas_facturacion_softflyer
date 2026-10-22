# 029 — Identificar comandas agregadas

**Estado:** ✅ Cerrada (2026-10-18)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H1 (mejora operativa)
**Documentos:** Doc. 05 §5 y §6 · Doc. 08 §8 · specs 006, 007 y 027

## Qué y por qué

Cuando un pedido ya fue enviado a cocina y el cliente solicita platos adicionales, cocina necesita distinguir esa nueva tanda de la comanda inicial. La nueva comanda se marca como **«AGREGÓ»** tanto en el KDS como en el ticket impreso para evitar que el agregado pase desapercibido.

## Criterios de aceptación

- [x] La primera tanda de un pedido no muestra la marca «AGREGÓ».
- [x] Todo envío posterior del mismo pedido se identifica como agregado, incluso si es la primera comanda que recibe una estación concreta.
- [x] La tarjeta del KDS muestra «AGREGÓ» de forma visible.
- [x] El ticket de 80 mm muestra «AGREGÓ» de forma visible.
- [x] La condición queda persistida y cubierta por pruebas de backend.

## Fuera de alcance

- Cambiar el flujo para agregar platos o los estados de cocina.
- Autoimpresión mediante el agente local de la spec 028.

## Cierre (2026-10-18)

- `comandas.es_agregado` persiste la intención del envío; las tandas 2+ existentes se recuperaron como agregados seguros durante la migración.
- El KDS expone la marca mediante su contrato, la muestra como insignia amarilla y la imprime de forma destacada en el papel de 80 mm.
- Verificación: 146 pruebas backend (1,106 aserciones), ESLint y TypeScript en verde. `kitchen-board.tsx` pasa el auditor de Softflyer UI; el barrido global conserva 93 advertencias previas en Plano/Salón, fuera de esta spec.
