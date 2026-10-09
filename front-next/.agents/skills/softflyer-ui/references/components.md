# Especificación de Componentes — Softflyer UI

Biblioteca de componentes base diseñados para ergonomía híbrida (desktop + touch).

---

## 1. Botones de Acción

Todos los botones deben tener un área táctil mínima de `44px` de altura y feedback de pulsación con `active:scale-[0.99]`.

### 1.1 Botón Primario
Acciones principales (Guardar, Crear, Confirmar, Agregar plato).
```tsx
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-azul px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-azul-oscuro hover:shadow active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60 disabled:pointer-events-none";
```

### 1.2 Botón Secundario
Acciones de soporte (Cancelar, Volver, Guardar y agregar otro, Filtros).
```tsx
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-tinta shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none";
```

### 1.3 Botón de Peligro / Eliminación
Acciones destructivas reversibles o críticas con confirmación.
```tsx
export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60";
```

---

## 2. Campos de Entrada (Inputs & Selects)

* Altura: `44px` a `46px` (vía padding `py-2.5` y `text-base`).
* Anillos de foco: `focus:ring-4 focus:ring-azul/10` con borde `focus:border-azul`.
* Tamaño de fuente: mínimo 16px (`text-base`) para evitar que Safari en iOS active el zoom automático de pantalla.

```tsx
export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta transition-all placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none aria-invalid:border-red-400 aria-invalid:focus:ring-red-100";
```

---

## 3. Switch Deslizante Táctil

Para activar o desactivar elementos al vuelo (visibilidad de plato, apertura de estación, etc.) sin abrir modales.

```tsx
<button
  type="button"
  role="switch"
  aria-checked={isActive}
  onClick={onToggle}
  className={`relative h-6.5 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 ${
    isActive ? "bg-emerald-500" : "bg-slate-300"
  }`}
>
  <span
    className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
      isActive ? "translate-x-4.5" : "translate-x-0"
    }`}
  />
</button>
```

---

## 4. Paneles Laterales (Drawers)

Paneles que emergen desde la derecha para editar o crear registros sin perder el contexto visual de la lista.

* **Backdrop:** `fixed inset-0 bg-tinta/50 backdrop-blur-xs animate-in fade-in`.
* **Panel:** `animate-in slide-in-from-right duration-200 bg-white shadow-2xl sm:max-w-md w-full`.
* **Cierre:** Tecla `Escape` o clic en el backdrop. Foco inicial automático en el primer input.

---

## 5. Estados Vacíos (Empty States)

Toda sección sin datos debe tener un estado vacío guiado que inspire confianza:
* Icono enmarcado en contenedor circular o redondeado con gradiente tenue de marca (`from-celeste/20 to-azul/10`).
* Título positivo: "Tu carta está lista para crearse" o "Sin platos en esta sección".
* 2–3 pasos numerados explicativos.
* Botón de acción principal con llamada directa.
