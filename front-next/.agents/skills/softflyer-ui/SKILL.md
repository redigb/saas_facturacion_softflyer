---
name: softflyer-ui
description: Estándares de diseño de interfaz, experiencia de usuario y componentes para el frontend de Softflyer (Next.js, Tailwind CSS, ergonomía híbrida desktop/touch, botones táctiles de 44-48px, sidebar colapsable, tokens oficiales y módulo restaurante). Usa siempre este skill cuando el usuario pida diseñar, crear, modificar, pulir o evaluar pantallas, botones, formularios, menús, drawers, modales o layouts en el frontend o panel de restaurante de Softflyer, incluso si solo menciona 'mejorar la UI' o 'hacer botones más grandes'.
---

# Softflyer UI — Sistema de Diseño y Ergonomía Híbrida

Guía técnica de estándares visuales, componentes e interacción táctil para `front-next`. Toda pantalla o componente creado en Softflyer debe adherirse a esta guía para mantener consistencia, elegancia y accesibilidad operacional.

---

## 1. Estructura y Recursos del Skill

Este skill cuenta con recursos agrupados según el estándar de `skill-creator`:

```text
softflyer-ui/
├── SKILL.md                    ← Guía principal y reglas inmediatas
├── references/                 ← Documentación de referencia en profundidad
│   ├── tokens.md               ← Paleta oficial, tipografía Montserrat y reglas de números tabulares
│   ├── components.md           ← Especificación y código base de botones, inputs, drawers y modales
│   └── touch-rules.md          ← Reglas ergonómicas para touch screens TPV y tablets de mesero
└── scripts/                    ← Arnés de verificación automática
    └── check_ui.py             ← Script para auditar cumplimiento de ergonomía y tokens en el código

Nota: Los activos visuales de la aplicación residen en `front-next/src/assets/icons/`:
├── carta.svg, cocina.svg, pedidos.svg, plano.svg, caja.svg, inventario.svg...
```

---

## 2. Filosofía: Ergonomía Híbrida (Desktop & Touch)

Softflyer opera en dos contextos con necesidades ergonómicas distintas:

| Contexto | Usuarios | Dispositivos | Objetivo Ergonómico |
|---|---|---|---|
| **Gestión / Administración** | Dueño, Administrador, Contador | Laptop, PC de escritorio (mouse y teclado) o tablet de oficina. | **SaaS Premium:** Densidad de datos equilibrada, lectura rápida sin scroll excesivo, sidebar colapsable para ganar ancho útil de pantalla. |
| **Operación / Punto de Venta** | Mozo, Cajero, Jefe de Cocina | Monitor táctil TPV de 15", tablet o smartphone en mano. | **Touch POS:** Botones grandes (44–56px), tipografía grande (15–18px), cero clics milimétricos, feedback táctil inmediato. |

> **Principio clave:** En pantallas administrativas (como la Carta), combina lo mejor de ambos mundos: áreas de toque confortables de 44–48px que se pueden pulsar con el dedo en una tablet pero que lucen limpias, ágiles y compactas con el mouse de una laptop. (Ver detalle en [`references/touch-rules.md`](references/touch-rules.md)).

---

## 3. Tokens Oficiales de Identidad de Marca

La paleta y tipografía de Softflyer son inmutables. Nunca introduzcas colores o fuentes fuera de estos tokens (detalle en [`references/tokens.md`](references/tokens.md)):

* **Tipografía:** `Montserrat` (`font-sans`).
* **Precios y cifras numéricas:** Números tabulares obligatorios (`tabular-nums`) para alineación perfecta en columnas.
* **Azul Principal (`#0c5ea7`):** Énfasis primario, botones de acción principal, navegación activa.
* **Celeste (`#18b4fa`):** Acentos vibrantes, anillos de foco interactivo, estados de carga, insignias de prueba.
* **Amarillo (`#fccd0b`):** Alertas de atención, avisos de modo demo, acentos cálidos.
* **Azul Oscuro (`#083f71`):** Hover de botones primarios y sombras de profundidad.
* **Tinta (`#0b2a4a`):** Texto principal de alta legibilidad, títulos y contrastes.
* **Niebla (`#f3f8fc`):** Fondo general de la aplicación y tarjetas de bajo contraste.

---

## 4. Sidebar Colapsable del Panel

El layout principal del panel (`panel-shell.tsx`) implementa el patrón colapsable ergonómico:

1. **Botón flotante en el divisor:**
   * Botón circular (`h-7 w-7`) situado en la línea divisoria derecha del menú lateral (`-right-3.5 top-7`).
   * Contiene un chevron que rota 180° (`rotate-90` en expandido, `-rotate-90` en colapsado).
   * Al pulsar, alterna suavemente con `transition-all duration-300 ease-in-out`.
2. **Modo Colapsado (`w-20`):**
   * El sidebar se reduce a una franja delgada de iconos centrados de tamaño generoso (`h-6 w-6`).
   * El ítem activo lleva un contenedor redondeado (`rounded-2xl bg-azul text-white ring-2 ring-azul/20`).
   * Cada icono incluye `title` nativo o tooltip flotante.
   * El área de contenido principal se expande coordinadamente (`lg:pl-20`) para dar máximo ancho de lectura al administrador.
3. **Modo Expandido (`w-68`):**
   * Muestra logo completo, títulos de sección en mayúsculas pequeñas (`text-[10px] tracking-widest text-slate-400`) e ítem con icono + etiqueta textual.

---

## 5. Medidas y Áreas de Toque Táctiles

* **Botones de acción:** Altura mínima de `44px` (ideal `44px–48px`).
* **Inputs y Selects:** Altura de `44px–46px`, texto de base `text-base` (16px) para evitar zoom involuntario en navegadores móviles.
* **Switches deslizantes:** Tamaño generoso de `44×26px` con cápsula deslizante blanca con sombra táctil.
* **Espaciado de seguridad:** Mínimo `8px` entre elementos interactivos para evitar toques erróneos.

---

## 6. Componentes Estándar

Ver implementaciones completas en [`references/components.md`](references/components.md).

* **Botón Primario:** `bg-azul text-white font-bold rounded-xl shadow-sm transition-all hover:bg-azul-oscuro active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-celeste/40`.
* **Botón Secundario:** `border border-slate-200 bg-white text-tinta font-bold rounded-xl shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99]`.
* **Botón de Peligro:** `text-red-600 font-bold rounded-xl hover:bg-red-50`.
* **Drawers Laterales:** Entrada con backdrop `backdrop-blur-xs bg-tinta/50 animate-in fade-in` y panel con `slide-in-from-right duration-200`. Cerrar con tecla Escape o clic fuera.
* **Empty States:** Tarjeta con ícono en gradiente tenue de marca, pasos ilustrados y botón principal destacado.
* **Cargas:** Esqueletos (`Skeleton`) con `animate-pulse bg-slate-200/70 rounded-xl`.

---

## 7. Biblioteca de Iconos SVG

En la carpeta [`front-next/src/assets/icons/`](../../../front-next/src/assets/icons/) se encuentran los SVGs normalizados:
* `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`.
* Iconos disponibles: `carta.svg`, `cocina.svg`, `caja.svg`, `pedidos.svg`, `plano.svg`, `inventario.svg`...

---

## 8. Arnés de Verificación (Testing de UI)

Para validar automáticamente que los componentes de `front-next/src` cumplen con todos los estándares ergonómicos y tokens oficiales:

```bash
python .agents/skills/softflyer-ui/scripts/check_ui.py
```

El script audita:
1. Existencia de `tabular-nums` en montos monetarios formateados.
2. Que los inputs no tengan tamaños de fuente diminutos (< 16px) para evitar auto-zoom móvil.
3. Ausencia de colores hexadecimales arbitrarios o clases fuera de la paleta oficial Softflyer.
