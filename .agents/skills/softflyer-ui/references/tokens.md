# Tokens Oficiales — Softflyer Design System

Este documento es la referencia inmutable de variables de diseño, colores y tipografía para el frontend de Softflyer.

---

## 1. Paleta de Colores

Softflyer utiliza una paleta corporativa y operacional precisa configurada en `@theme` en `src/app/globals.css`.

| Token CSS | Hex | Uso Exclusivo | Clases Tailwind |
|---|---|---|---|
| `--color-azul` | `#0c5ea7` | Acción primaria, navegación activa, botones principales, enlaces destacados. | `bg-azul`, `text-azul`, `border-azul`, `ring-azul` |
| `--color-celeste` | `#18b4fa` | Foco interactivo, acentos vibrantes, insignias de estado activo, loaders. | `bg-celeste`, `text-celeste`, `border-celeste`, `ring-celeste` |
| `--color-amarillo` | `#fccd0b` | Avisos de advertencia, insignia de cuenta demo, destaques cálidos. | `bg-amarillo`, `text-amarillo` |
| `--color-azul-oscuro` | `#083f71` | Hover de botones primarios, fondos de énfasis superior. | `bg-azul-oscuro`, `hover:bg-azul-oscuro` |
| `--color-tinta` | `#0b2a4a` | Textos de alto contraste, encabezados, títulos de tarjetas y modales. | `text-tinta`, `bg-tinta` |
| `--color-niebla` | `#f3f8fc` | Fondo general de la aplicación (`body`), contenedores de bajo contraste. | `bg-niebla` |

### Colores Semánticos Auxiliares
* **Éxito (Operativo):** `emerald-500` (`#10b981`) — Switches activos, platos disponibles, pagos confirmados.
* **Alerta / Desactivado:** `amber-500` / `amber-800` en fondo `amber-100` — Platos ocultos, modificadores obligatorios.
* **Error / Destructivo:** `red-600` (`#dc2626`) en fondo `red-50` — Botones de eliminación, errores 422 de validación.
* **Bordes y Divisores:** `slate-200` (`#e2e8f0`) y `slate-100` (`#f1f5f9`).
* **Textos Secundarios:** `slate-500` (`#64748b`) y `slate-400` (`#94a3b8`).

---

## 2. Tipografía y Números

### Familia Tipográfica
* **Fuente Principal:** `Montserrat` (`var(--font-montserrat)`).
* Siempre aplicada en el elemento raíz `html` o `body` vía `font-sans`.
* Jerarquía de pesos recomendados:
  * Regular (`font-normal` / 400): Textos de ayuda, descripciones secundarias.
  * Semi-negrita (`font-semibold` / 600): Subtítulos, etiquetas de campos, filas de lista.
  * Negrita (`font-bold` / 700): Títulos, botones, precios, nombres de platos y estados.

### Formateo Numérico y Monetario
* **Regla estricta:** Todo precio, subtotal, total o cantidad numérica debe llevar obligatoriamente la clase `tabular-nums`.
* Evita el baile o desalineación visual de cifras en columnas cuando los dígitos cambian.
* Formato monetario peruano estándar: `S/ XX.XX` (siempre con 2 decimales string, nunca flotante arbitrario).

---

## 3. Sombras y Elevaciones

* `shadow-2xs`: Elevación mínima para tarjetas sutiles y botones secundarios (`shadow-[0_1px_2px_rgba(0,0,0,0.05)]`).
* `shadow-xs` / `shadow-sm`: Elevación de tarjetas de producto, botones primarios e inputs activos.
* `shadow-md` / `shadow-lg`: Botones flotantes (ej. botón colapsable del sidebar) y popovers.
* `shadow-2xl`: Paneles laterales (`Drawer`) y modales superpuestos.
