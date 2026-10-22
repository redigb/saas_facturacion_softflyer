# 029 — Frontend

## Para quién y dónde

El cocinero ve el KDS en una tablet o monitor durante el servicio y también puede imprimir la comanda en una ticketera de 80 mm.

## Flujo

1. La primera tanda entra al KDS con la presentación habitual.
2. Si el mozo envía más platos al mismo pedido, la nueva tarjeta muestra la insignia **«AGREGÓ»**.
3. Al imprimir esa comanda, el papel también muestra **«AGREGÓ»** en el encabezado.

## Experiencia

| Tema | Decisión |
|---|---|
| Visibilidad | Insignia amarilla, en mayúsculas y con alto contraste junto a la identificación de la comanda |
| Ticket | Leyenda centrada y destacada antes de los platos |
| Accesibilidad | La marca se expresa con texto, no solo con color |
| Primera tanda | No muestra ninguna etiqueta adicional |

## Tareas

- [x] Extender el esquema Zod del ticket.
- [x] Mostrar «AGREGÓ» en la tarjeta KDS y en el ticket impreso.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores; archivo modificado sin advertencias en `check_ui.py`.
