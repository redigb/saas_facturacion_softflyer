# Directrices Táctiles y POS — Ergonomía de Restaurante

Guía práctica para garantizar que la interfaz sea 100% operable en monitores táctiles de punto de venta (TPV), iPads, tablets y teléfonos móviles de meseros.

---

## 1. El Tamaño Mínimo de Toque (Target Size)

En un restaurante, los operadores suelen tener las manos húmedas, usar guantes o tocar la pantalla con prisa.
* **Área táctil mínima:** `44×44px` (recomendación estándar de Apple Human Interface Guidelines y WCAG 2.1 nivel AAA).
* **Botones críticos u operativos:** `48px` a `56px` (ej. botón de confirmar pedido, cobrar, enviar comanda a cocina).
* **Separación entre objetivos contiguos:** Mínimo `8px` de separación física para evitar pulsaciones accidentales del botón equivocado.

---

## 2. Prevención de Zoom Involuntario en Celulares

En Safari iOS y navegadores móviles de Android, pulsar un input con fuente inferior a `16px` provoca que el navegador haga un zoom automático agresivo, descolocando la pantalla y ralentizando la atención.

* **Regla estricta:** Todo campo `<input>`, `<select>` o `<textarea>` debe tener una tipografía base de al menos `16px` (`text-base`).
* Si se requiere texto visualmente más pequeño para etiquetas secundarias, utilízalo en `<label>` o hints (`text-xs` o `text-sm`), nunca dentro del elemento editable.

---

## 3. Feedback Táctil Inmediato (Active States)

Una pantalla táctil carece del cursor del mouse que indica cuándo un elemento es clickeable.
* **Estado activo:** Todo botón o tarjeta interactiva debe incluir `active:scale-[0.99]` o `active:bg-slate-100` para que el dedo sienta que la pantalla reaccionó de inmediato.
* **Actualizaciones optimistas:** En operaciones frecuentes (como apagar un plato agotado o cambiar el orden de una categoría), la interfaz debe reflejar el cambio en 0 ms antes de esperar la respuesta del servidor HTTP.

---

## 4. Desplazamiento Táctil Cómodo (Touch Scrolling)

* En listas y selectores de categorías móviles, usar contenedores horizontales con desplazamiento suave:
  ```tsx
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
  ```
* En desktop, reemplazar por listas verticales ordenables por drag-and-drop o atajos de teclado.
