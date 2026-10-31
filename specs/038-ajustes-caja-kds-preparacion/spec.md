# 038 — Ajustes de caja, KDS y preparación

**Estado:** Lista para probar (2026-10-31)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** Operación diaria (ajustes del negocio)
**Documentos:** Doc. 08 §8 y §10 · specs 007, 009, 031 y 033

## Qué y por qué

Cuatro ajustes pedidos por el negocio después de operar el sistema:

1. **Para llevar con mesa.** Un cliente sentado pide algo para llevar: ese pedido debe pertenecer a su mesa y cobrarse **en la misma boleta**, no como una cuenta aparte.
2. **Demora real en cocina.** Una comanda que pasa los **15 minutos** debe verse en rojo en el KDS (hoy el rojo aparece a los 20).
3. **Gastos digitales.** El cajero debe poder pagar un gasto con **Yape o Plin** (u otro método digital) sin que eso descuente el efectivo del arqueo.
4. **Preparación.** El formulario de ingredientes se cerraba al agregar uno nuevo y no permitía elegir unidad de medida.

## Criterios de aceptación

- [x] Un pedido `PARA_LLEVAR` puede indicar la mesa a la que pertenece (`mesa_referencia_id`); la mesa **no** queda ocupada por ese pedido.
- [x] El botón "Para llevar" permite elegir una mesa ocupada o "Sin mesa (mostrador)".
- [x] Al cobrar una mesa se pueden incluir sus pedidos para llevar: **una sola venta y un solo comprobante**, y ambos pedidos quedan cerrados.
- [x] Esos pedidos no aparecen como cuentas por cobrar independientes.
- [x] El resumen de caja muestra una sola orden con el nombre de la mesa.
- [x] Una mesa no puede incluir un para llevar de otra mesa ni de otra sucursal.
- [x] Una comanda con **15 o más minutos** de espera se pinta en rojo en el KDS (tarjeta y píldora).
- [x] Un gasto de caja puede registrarse con método digital; no reduce `efectivo_esperado`.
- [x] Un ingreso o retiro solo admite efectivo.
- [x] El resumen de caja separa `egresos_efectivo` y `egresos_digital`.
- [x] En Preparación, "Agregar ingrediente" y la papelera ya no envían el formulario ni cierran el panel.
- [x] Cada ingrediente puede llevar unidad `ONZ`, `ML`, `GR` o `KG`; otra unidad responde 422.
- [x] Las fichas guardadas con texto libre ("250 g") siguen leyéndose y editándose.

## Fuera de alcance

- Impresión física de dos pedidos en un solo papel.
- Umbral de demora configurable por sucursal (hoy es la constante `DEMORA_MIN = 15`).
- Conversión automática entre unidades o costeo de recetas.
- Conciliación bancaria de los pagos digitales.

## Verificación

- `php artisan test --filter="ChargeTest|OrderTest|PreparationTest|CashMovementTest|KitchenTest"`: en verde.
- `npx tsc --noEmit` y `npm run lint`: sin errores (solo warnings previos de `panel-shell` y `plataforma/login`).
- La suite completa falla solo en `EmissionTest` y `ProductImageTest` por faltar `ext-soap` y `ext-gd` en el PHP local de desarrollo.
- Pendiente el recorrido manual en navegador (mesa + para llevar, KDS con 16 min, gasto Yape, ingredientes con unidad).
