"use client";

import { newKey, nextTableCode, snap, type EditorAction, type EditorState, type FloorItem } from "@/app/panel/plano/editor-state";
import type { ElementType, TableShape } from "@/lib/schemas/plano";

const TABLES: { forma: TableShape; label: string; ancho: number; alto: number; capacidad: number }[] = [
  { forma: "CUADRADA", label: "Cuadrada", ancho: 100, alto: 100, capacidad: 4 },
  { forma: "REDONDA", label: "Redonda", ancho: 90, alto: 90, capacidad: 2 },
  { forma: "RECTANGULAR", label: "Rectangular", ancho: 180, alto: 100, capacidad: 6 },
];

const ELEMENTS: { tipo: ElementType; label: string; ancho: number; alto: number }[] = [
  { tipo: "BARRA", label: "Barra", ancho: 220, alto: 70 },
  { tipo: "PARED", label: "Pared", ancho: 300, alto: 12 },
  { tipo: "PUERTA", label: "Puerta", ancho: 100, alto: 12 },
  { tipo: "VENTANA", label: "Ventana", ancho: 120, alto: 10 },
  { tipo: "COLUMNA", label: "Columna", ancho: 40, alto: 40 },
  { tipo: "PLANTA", label: "Planta", ancho: 50, alto: 50 },
  { tipo: "BANO", label: "Baños", ancho: 120, alto: 100 },
  { tipo: "CAJA", label: "Caja", ancho: 120, alto: 80 },
  { tipo: "COCINA", label: "Cocina", ancho: 200, alto: 120 },
  { tipo: "TEXTO", label: "Texto", ancho: 160, alto: 40 },
];

/** Un toque agrega el objeto al centro del salón, ya seleccionado. */
export function Toolbar({ state, dispatch }: { state: EditorState; dispatch: (action: EditorAction) => void }) {
  function center(ancho: number, alto: number) {
    return { pos_x: snap(Math.max(0, (state.width - ancho) / 2)), pos_y: snap(Math.max(0, (state.height - alto) / 2)), ancho, alto, rotacion: 0 };
  }

  function addTable(option: (typeof TABLES)[number]) {
    const item: FloorItem = {
      key: newKey(),
      kind: "mesa",
      codigo: nextTableCode(state.items),
      capacidad: option.capacidad,
      forma: option.forma,
      estado: "LIBRE",
      ...center(option.ancho, option.alto),
    };
    dispatch({ type: "add", item });
  }

  function addElement(option: (typeof ELEMENTS)[number]) {
    const item: FloorItem = {
      key: newKey(),
      kind: "elemento",
      tipo: option.tipo,
      etiqueta: option.tipo === "TEXTO" ? "Texto" : null,
      capa: 0,
      ...center(option.ancho, option.alto),
    };
    dispatch({ type: "add", item });
  }

  const tool =
    "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-tinta transition-all hover:border-azul hover:text-azul active:scale-[0.98]";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-niebla p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 px-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Mesas</span>
        {TABLES.map((option) => (
          <button key={option.forma} type="button" onClick={() => addTable(option)} className={tool}>
            <span className={`inline-block border-2 border-azul ${option.forma === "REDONDA" ? "h-4 w-4 rounded-full" : option.forma === "RECTANGULAR" ? "h-3.5 w-6 rounded-sm" : "h-4 w-4 rounded-sm"}`} />
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto sm:border-l sm:border-slate-200 sm:pl-3">
        <span className="shrink-0 px-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Elementos</span>
        {ELEMENTS.map((option) => (
          <button key={option.tipo} type="button" onClick={() => addElement(option)} className={tool}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
