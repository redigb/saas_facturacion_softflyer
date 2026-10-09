"use client";

import { useState } from "react";

import {
  newKey,
  nextTableCode,
  snap,
  type EditorAction,
  type EditorState,
  type FloorItem,
} from "@/app/panel/plano/editor-state";
import { Icon } from "@/components/icons";
import { Button, CustomSelect, Input } from "@/components/ui";
import { TABLE_SHAPES, type ElementType, type TableShape } from "@/lib/schemas/plano";

type Props = {
  state: EditorState;
  item?: FloorItem;
  error?: string;
  dispatch: (action: EditorAction) => void;
};

const SHAPE_LABEL: Record<TableShape, string> = {
  CUADRADA: "Cuadrada",
  REDONDA: "Redonda",
  RECTANGULAR: "Rectangular",
};

const ELEMENT_NAME: Record<string, string> = {
  BARRA: "Barra",
  PARED: "Pared",
  PUERTA: "Puerta",
  VENTANA: "Ventana",
  COLUMNA: "Columna",
  PLANTA: "Planta",
  BANO: "Baños",
  CAJA: "Caja",
  COCINA: "Cocina",
  TEXTO: "Texto",
};

const TABLES: { forma: TableShape; label: string; sub: string; ancho: number; alto: number; capacidad: number }[] = [
  { forma: "CUADRADA", label: "Cuadrada", sub: "4 pers.", ancho: 100, alto: 100, capacidad: 4 },
  { forma: "REDONDA", label: "Redonda", sub: "2 pers.", ancho: 90, alto: 90, capacidad: 2 },
  { forma: "RECTANGULAR", label: "Rectangular", sub: "6 pers.", ancho: 180, alto: 100, capacidad: 6 },
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

/** Paleta de Herramientas (Panel Izquierdo): Mesas y Elementos compactos y sin redondeos excesivos */
export function ToolPalette({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
}) {
  function center(ancho: number, alto: number) {
    return {
      pos_x: snap(Math.max(0, (state.width - ancho) / 2)),
      pos_y: snap(Math.max(0, (state.height - alto) / 2)),
      ancho,
      alto,
      rotacion: 0,
    };
  }

  function addTable(option: (typeof TABLES)[number]) {
    const newItem: FloorItem = {
      key: newKey(),
      kind: "mesa",
      codigo: nextTableCode(state.items),
      capacidad: option.capacidad,
      forma: option.forma,
      estado: "LIBRE",
      ...center(option.ancho, option.alto),
    };
    dispatch({ type: "add", item: newItem });
    dispatch({ type: "select", key: newItem.key });
  }

  function addElement(option: (typeof ELEMENTS)[number]) {
    const newItem: FloorItem = {
      key: newKey(),
      kind: "elemento",
      tipo: option.tipo,
      etiqueta: option.tipo === "TEXTO" ? "Texto" : null,
      capa: 0,
      ...center(option.ancho, option.alto),
    };
    dispatch({ type: "add", item: newItem });
    dispatch({ type: "select", key: newItem.key });
  }

  return (
    <aside
      className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"
      aria-label="Herramientas del salón"
    >
      {/* SECCIÓN 1: MESAS */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Mesas</h4>
          <span className="text-[10px] font-semibold text-azul">Arrastrar</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TABLES.map((t) => (
            <button
              key={t.forma}
              type="button"
              draggable={true}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    kind: "mesa",
                    forma: t.forma,
                    ancho: t.ancho,
                    alto: t.alto,
                    capacidad: t.capacidad,
                  })
                );
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => addTable(t)}
              title="Arrastra al plano o haz clic para agregar"
              className="flex min-h-[44px] cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left transition-all hover:border-azul hover:bg-azul/5 active:cursor-grabbing active:scale-[0.98]"
            >
              <span
                className={`shrink-0 border-2 border-azul ${
                  t.forma === "REDONDA"
                    ? "h-4 w-4 rounded-full"
                    : t.forma === "RECTANGULAR"
                    ? "h-3.5 w-6 rounded-xs"
                    : "h-4 w-4 rounded-xs"
                }`}
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-tinta">{t.label}</span>
                <span className="block text-[10px] font-medium text-slate-400 tabular-nums">
                  {t.sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: ELEMENTOS ARQUITECTÓNICOS */}
      <div className="border-t border-slate-100 pt-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Elementos</h4>
          <span className="text-[10px] font-semibold text-azul">Arrastrar</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ELEMENTS.map((elem) => (
            <button
              key={elem.tipo}
              type="button"
              draggable={true}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    kind: "elemento",
                    tipo: elem.tipo,
                    ancho: elem.ancho,
                    alto: elem.alto,
                  })
                );
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => addElement(elem)}
              title="Arrastra al plano o haz clic para agregar"
              className="flex min-h-[40px] cursor-grab items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-all hover:border-azul hover:bg-azul/5 active:cursor-grabbing active:scale-[0.98]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span className="truncate text-xs font-bold text-tinta">{elem.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Tarjeta de Propiedades del Objeto Seleccionado (Panel Derecho) */
export function ItemPropertiesCard({
  state,
  item,
  error,
  dispatch,
}: {
  state: EditorState;
  item: FloorItem;
  error?: string;
  dispatch: (action: EditorAction) => void;
}) {
  const update = (patch: Partial<FloorItem>) => {
    dispatch({ type: "update", key: item.key, patch, record: true });
  };
  const rotate = (delta: number) => {
    update({ rotacion: (((item.rotacion + delta) % 360) + 360) % 360 });
  };
  const busy = item.kind === "mesa" && item.estado !== "LIBRE";
  const itemTitle = item.kind === "mesa" ? `Mesa ${item.codigo}` : ELEMENT_NAME[item.tipo];

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
      aria-label="Propiedades del elemento"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-tinta">{itemTitle}</h3>
          <p className="text-[11px] text-slate-400">Propiedades del elemento</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "select", key: null })}
          aria-label="Cerrar propiedades"
        >
          <Icon name="cerrar" className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600">
          <Icon name="alerta" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {item.kind === "mesa" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-tinta">Código</span>
              <Input
                value={item.codigo}
                maxLength={10}
                hasError={Boolean(error)}
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    key: item.key,
                    patch: { codigo: event.target.value.toUpperCase() },
                  })
                }
                onFocus={() => dispatch({ type: "checkpoint" })}
                className="h-9 rounded-lg text-sm"
              />
            </label>
            <NumberField
              label="Personas"
              value={item.capacidad}
              min={1}
              max={50}
              onCommit={(capacidad) => update({ capacidad })}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-bold text-tinta">Forma</span>
            <CustomSelect
              value={item.forma}
              onChange={(forma) => update({ forma: forma as TableShape })}
              options={TABLE_SHAPES.map((shape) => ({ value: shape, label: SHAPE_LABEL[shape] }))}
            />
          </div>
          {busy ? (
            <p className="text-[11px] font-semibold text-slate-500">
              Esta mesa está en uso: no se puede quitar hasta cerrar su pedido.
            </p>
          ) : null}
        </>
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-tinta">Etiqueta</span>
          <Input
            value={item.etiqueta ?? ""}
            maxLength={40}
            placeholder="Opcional"
            onChange={(event) =>
              dispatch({
                type: "update",
                key: item.key,
                patch: { etiqueta: event.target.value || null },
              })
            }
            onFocus={() => dispatch({ type: "checkpoint" })}
            className="h-9 rounded-lg text-sm"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Ancho"
          value={item.ancho}
          min={10}
          max={state.width}
          onCommit={(ancho) => update({ ancho })}
        />
        <NumberField
          label="Alto"
          value={item.alto}
          min={10}
          max={state.height}
          onCommit={(alto) => update({ alto })}
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-bold text-tinta">Rotación: {item.rotacion}°</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => rotate(-15)} className="flex-1">
            ↺ 15°
          </Button>
          <Button variant="secondary" size="sm" onClick={() => rotate(15)} className="flex-1">
            ↻ 15°
          </Button>
        </div>
      </div>

      {item.kind === "elemento" ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => update({ capa: item.capa + 1 })} className="flex-1">
            Al frente
          </Button>
          <Button variant="secondary" size="sm" onClick={() => update({ capa: item.capa - 1 })} className="flex-1">
            Atrás
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2 border-t border-slate-100 pt-2.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dispatch({ type: "duplicate", key: item.key })}
          className="flex-1"
        >
          Duplicar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => dispatch({ type: "remove", key: item.key })}
          disabled={busy}
          className="flex-1"
        >
          <Icon name="basura" className="h-4 w-4" />
          Quitar
        </Button>
      </div>
    </div>
  );
}

/** Tarjeta independiente con las dimensiones del salón para la columna derecha */
export function RoomDimensionsCard({
  width,
  height,
  dispatch,
}: {
  width: number;
  height: number;
  dispatch: (action: EditorAction) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
      aria-label="Dimensiones del salón"
    >
      <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        Dimensiones del salón
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Ancho"
          value={width}
          min={200}
          max={5000}
          onCommit={(w) => dispatch({ type: "resize-room", width: w, height })}
        />
        <NumberField
          label="Alto"
          value={height}
          min={200}
          max={5000}
          onCommit={(h) => dispatch({ type: "resize-room", width, height: h })}
        />
      </div>
      <p className="text-[11px] leading-relaxed font-medium text-slate-400">
        Unidades del plano en pixeles virtuales. Se escala automáticamente.
      </p>
    </div>
  );
}

/** Panel combinado histórico para compatibilidad */
export function PropertiesPanel({ state, item, error, dispatch }: Props) {
  const [activeTab, setActiveTab] = useState<"palette" | "properties">("palette");
  const isEditingItem = Boolean(item);
  const showProperties = isEditingItem && activeTab === "properties";

  return (
    <div className="flex flex-col gap-3">
      {item ? (
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${
              activeTab === "properties" ? "bg-white text-azul shadow-xs" : "text-slate-500 hover:text-azul"
            }`}
          >
            <span>{item.kind === "mesa" ? `Mesa ${item.codigo}` : ELEMENT_NAME[item.tipo]}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("palette")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${
              activeTab === "palette" ? "bg-white text-azul shadow-xs" : "text-slate-500 hover:text-azul"
            }`}
          >
            <Icon name="mas" className="h-3.5 w-3.5" />
            <span>Agregar</span>
          </button>
        </div>
      ) : null}

      {item && showProperties ? (
        <ItemPropertiesCard state={state} item={item} error={error} dispatch={dispatch} />
      ) : (
        <ToolPalette state={state} dispatch={dispatch} />
      )}
    </div>
  );
}

/** Campo numérico con commit en onBlur o Enter */
function NumberField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  function commit(input: HTMLInputElement) {
    const parsed = Math.round(Number(input.value));
    if (!Number.isFinite(parsed)) return;
    const next = Math.min(Math.max(parsed, min), max);
    input.value = String(next);
    if (next !== Math.round(value)) onCommit(next);
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-tinta">{label}</span>
      <Input
        key={value}
        type="number"
        inputMode="numeric"
        defaultValue={Math.round(value)}
        min={min}
        max={max}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => event.key === "Enter" && commit(event.currentTarget)}
        className="h-9 rounded-lg text-sm tabular-nums"
      />
    </label>
  );
}
