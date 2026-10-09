---
name: softflyer-atomic-design
description: Guía y arquitectura de Diseño Atómico (Atomic Design) para Next.js en Softflyer. Organiza la UI en 5 niveles (Átomos, Moléculas, Organismos, Plantillas y Páginas) garantizando reutilización, desacoplamiento, ergonomía táctil (44-48px) y archivos limpios menores a 200-300 líneas.
---

# Softflyer Atomic Design — Arquitectura de Componentes UI

Este skill establece los principios, estructura de directorios y estándares de implementación de los **5 niveles del Diseño Atómico** adaptados a Next.js App Router, Tailwind CSS y los tokens oficiales de Softflyer.

---

## 1. Los 5 Niveles del Diseño Atómico en Softflyer

```text
src/
├── components/
│   ├── icons.tsx                  ← Biblioteca de iconos SVG
│   └── ui/
│       ├── atoms/                 ← Nivel 1: Bloques indivisibles (Button, Input, Badge, Switch, PriceText)
│       ├── molecules/             ← Nivel 2: Combinaciones de átomos (SearchInput, FormField, ProductAvatar, PriceCell, EmptyState)
│       ├── organisms/             ← Nivel 3: Secciones complejas autónomas (ProductCard, ProductRow, CategoryList, ProductDrawer)
│       └── templates/             ← Nivel 4: Esqueletos de distribución espacial (MasterDetailLayout, PanelShell)
└── app/
    └── panel/
        └── carta/
            └── page.tsx           ← Nivel 5: Páginas con datos reales, estado y mutaciones (React Query)
```

---

### Nivel 1: Átomos (Atoms)
Son los bloques de construcción más básicos e indivisibles. No dependen de otros componentes de la UI ni de lógica de negocio o de dominio.
- **Responsabilidad:** Renderizar elementos visuales primitivos accesibles con soporte táctil.
- **Ubicación:** `src/components/ui/atoms/`
- **Ejemplos:**
  - `Button`: Botón táctil ergonómico (`variant: "primary" | "secondary" | "danger" | "ghost"`, `size`, `min-h-[44px]`).
  - `Input`: Campo de texto con tokens oficiales (`h-11` o `h-12`, foco en `#0c5ea7`, estados de error accesibles).
  - `Badge`: Píldora de estado (`neutral`, `info`, `warning`, `success`).
  - `Switch`: Conmutador táctil ergonómico de 56×32px accesible con rol `switch`.
  - `PriceText`: Formateo de moneda con `tabular-nums` y tipografía destacada.

---

### Nivel 2: Moléculas (Molecules)
Grupos de átomos enlazados que cumplen una función simple y cohesiva.
- **Responsabilidad:** Combinar 2 o más átomos para crear un patrón de interacción reusable.
- **Ubicación:** `src/components/ui/molecules/`
- **Ejemplos:**
  - `SearchInput`: Input + Icono de lupa + Botón de limpiar `X`.
  - `FormField`: Label + Input/Select/Textarea + Hint o Mensaje de Error con `useId`.
  - `SegmentedControl`: Grupo de botones tipo switch para cambiar de vista (Lista / Tarjetas).
  - `ProductAvatar`: Icono temático dentro de cápsula redondeada (`h-13 w-13` o `h-14 w-14`) para comida o bebida.
  - `PriceCell`: Lectura táctil en negrita + edición rápida al pulsar (con validación y confirmación).
  - `EmptyState`: Ícono ilustrado + título + descripción explicativa + botón de acción.

---

### Nivel 3: Organismos (Organisms)
Componentes complejos formados por la unión de moléculas y átomos que representan secciones concretas y autónomas de una interfaz.
- **Responsabilidad:** Presentar una entidad de datos o controlar un flujo específico (puede recibir callbacks o modelos del dominio).
- **Ubicación:** `src/components/ui/organisms/` (o agrupados en submódulos si son específicos de dominio).
- **Ejemplos:**
  - `ProductCard`: Tarjeta táctil POS para cuadrícula con avatar, badges, título, precio editable y switch de visibilidad.
  - `ProductRow`: Fila de lista amplia de producto con avatar, badges, precio y switch táctil.
  - `ProductDrawer`: Panel lateral animado con formulario de creación/edición de plato.
  - `CategoryList`: Listado lateral de categorías con selector activo y acciones.

---

### Nivel 4: Plantillas (Templates)
Estructuras o wireframes de página donde se distribuyen los organismos sin depender directamente de llamadas a APIs concretas.
- **Responsabilidad:** Definir el diseño de la cuadrícula, el comportamiento responsivo (ej. sidebar 320px vs contenido) y los slots de contenido.
- **Ubicación:** `src/components/ui/templates/`
- **Ejemplos:**
  - `MasterDetailLayout`: Layout con panel lateral (categorías/filtros) y panel principal (lista/tarjetas), colapsable en móvil.
  - `PanelShell`: Layout maestro con navegación lateral, barra superior y área de contenido expandible.

---

### Nivel 5: Páginas (Pages)
La pantalla completa en el Next.js App Router (`page.tsx`), donde se inyectan los datos reales desde la API, React Query, cookies de sesión y handlers de mutación.
- **Responsabilidad:** Orquestar datos, permisos del usuario, queries y mutaciones.
- **Ubicación:** `src/app/.../page.tsx`

---

## 2. Reglas de Desacoplamiento y Límites de Archivo

1. **Límite de Líneas:** Ningún archivo de componente debe exceder las 200–250 líneas. Si supera ese límite, descompón en moléculas u organismos hijos.
2. **Sin Lógica Pesada en Átomos:** Los átomos solo reciben `props` de presentación y callbacks nativos (`onClick`, `onChange`, `value`, etc.).
3. **Cero Duplicación de Estilos:** No copies y pegues clases extensas de Tailwind; reutiliza los átomos (`Button`, `Input`, `Switch`) para mantener la coherencia visual.
4. **Respeto a los Tokens:** Preservar `Montserrat`, `tabular-nums` en precios y colores oficiales (`#0c5ea7`, `#18b4fa`, `#fccd0b`, `#0b2a4a`).
5. **Ergonomía Táctil Obligatoria:** Todo elemento interactivo debe garantizar un área de toque mínima de `44×44px` (ideal `48px`).
