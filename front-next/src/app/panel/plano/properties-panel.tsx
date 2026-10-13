"use client";

import { useState } from "react";

import {
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

/** Paleta de Herramientas (Panel Izquierdo): Mesas y Elementos interactivos por arrastre exclusivamente */
export function ToolPalette() {
  return (
    <aside
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
      aria-label="Herramientas del salón"
    >
      {/* SECCIÓN 1: MESAS */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Mesas</h4>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-azul">
            <Icon name="arrastrar" className="h-3 w-3" />
            Arrastrar
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {TABLES.map((t) => (
            <div
              key={t.forma}
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
              title="Arrastra esta mesa hacia el plano"
              className="group flex cursor-grab select-none items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 transition-all hover:border-azul hover:bg-azul/5 hover:shadow-xs active:cursor-grabbing active:scale-[0.99]"
            >
              <TablePreview forma={t.forma} />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-tinta group-hover:text-azul transition-colors">
                  {t.label}
                </span>
                <span className="block text-[11px] font-medium text-slate-400 tabular-nums">
                  {t.sub}
                </span>
              </div>
              <Icon
                name="arrastrar"
                className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-azul transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: ELEMENTOS ARQUITECTÓNICOS */}
      <div className="border-t border-slate-100 pt-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Elementos</h4>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-azul">
            <Icon name="arrastrar" className="h-3 w-3" />
            Arrastrar
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ELEMENTS.map((elem) => (
            <div
              key={elem.tipo}
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
              title={`Arrastra ${elem.label} hacia el plano`}
              className="group flex min-h-[40px] cursor-grab select-none items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 transition-all hover:border-azul hover:bg-azul/5 hover:shadow-xs active:cursor-grabbing active:scale-[0.99]"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                <ElementIcon tipo={elem.tipo} />
              </div>
              <span className="truncate text-xs font-bold text-tinta group-hover:text-azul transition-colors">
                {elem.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Previsualización SVG lúcida de mesas con sillas para la paleta lateral */
function TablePreview({ forma }: { forma: TableShape }) {
  if (forma === "CUADRADA") {
    return (
      <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" fill="none" aria-hidden="true">
        <rect x="9" y="9" width="16" height="16" rx="2.5" fill="#ffffff" stroke="#0c5ea7" strokeWidth="1.8" />
        <rect x="12" y="3" width="10" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
        <rect x="12" y="27" width="10" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
        <rect x="3" y="12" width="4" height="10" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
        <rect x="27" y="12" width="4" height="10" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      </svg>
    );
  }
  if (forma === "REDONDA") {
    return (
      <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" fill="none" aria-hidden="true">
        <circle cx="17" cy="17" r="8.5" fill="#ffffff" stroke="#0c5ea7" strokeWidth="1.8" />
        <rect x="12" y="3" width="10" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
        <rect x="12" y="27" width="10" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 42 34" className="h-8 w-10 shrink-0" fill="none" aria-hidden="true">
      <rect x="8" y="9" width="26" height="16" rx="2.5" fill="#ffffff" stroke="#0c5ea7" strokeWidth="1.8" />
      <rect x="11" y="3" width="8" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      <rect x="23" y="3" width="8" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      <rect x="11" y="27" width="8" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      <rect x="23" y="27" width="8" height="4" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      <rect x="2" y="13" width="4" height="8" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
      <rect x="36" y="13" width="4" height="8" rx="1.5" fill="#f8fafc" stroke="#0c5ea7" strokeWidth="1.4" />
    </svg>
  );
}

/** Iconos SVG arquitectónicos lúcidos para cada elemento de la paleta */
function ElementIcon({ tipo }: { tipo: ElementType }) {
  switch (tipo) {
  case "BARRA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="16" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
        <circle cx="5.5" cy="14" r="2" fill="currentColor" fillOpacity="0.2" />
        <circle cx="14.5" cy="14" r="2" fill="currentColor" fillOpacity="0.2" />
        <path d="M5.5 12V9M14.5 12V9" />
      </svg>
    );
  case "PARED":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-700" fill="currentColor" aria-hidden="true">
        <rect x="2" y="6" width="16" height="8" rx="1.5" />
        <line x1="2" y1="10" x2="18" y2="10" stroke="#fff" strokeWidth="1" />
        <line x1="7" y1="6" x2="7" y2="10" stroke="#fff" strokeWidth="1" />
        <line x1="13" y1="6" x2="13" y2="10" stroke="#fff" strokeWidth="1" />
        <line x1="10" y1="10" x2="10" y2="14" stroke="#fff" strokeWidth="1" />
      </svg>
    );
  case "PUERTA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 16V4" strokeWidth="2" />
        <path d="M4 16A12 12 0 0 1 16 4" strokeDasharray="2.5 2" />
        <circle cx="4" cy="16" r="1.5" fill="currentColor" />
      </svg>
    );
  case "VENTANA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-sky-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="14" height="14" rx="1.5" fill="currentColor" fillOpacity="0.15" />
        <line x1="10" y1="3" x2="10" y2="17" />
        <line x1="3" y1="10" x2="17" y2="10" />
      </svg>
    );
  case "COLUMNA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="4" y="4" width="12" height="12" rx="1.5" fill="currentColor" fillOpacity="0.15" />
        <line x1="4" y1="4" x2="16" y2="16" />
        <line x1="16" y1="4" x2="4" y2="16" />
      </svg>
    );
  case "PLANTA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
        <path d="M10 3v4M10 13v4M3 10h4M13 10h4" strokeWidth="1.4" />
      </svg>
    );
  case "BANO":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" fillOpacity="0.1" />
        <text x="10" y="11" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="8" fontWeight="bold" stroke="none">WC</text>
      </svg>
    );
  case "CAJA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" fill="currentColor" fillOpacity="0.1" />
        <rect x="5.5" y="6.5" width="9" height="4" rx="0.5" fill="currentColor" fillOpacity="0.2" />
        <line x1="6" y1="13" x2="8.5" y2="13" />
        <line x1="10.5" y1="13" x2="14" y2="13" />
      </svg>
    );
  case "COCINA":
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" fill="currentColor" fillOpacity="0.1" />
        <circle cx="7.5" cy="10" r="2.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="12.5" cy="10" r="2.5" fill="currentColor" fillOpacity="0.2" />
      </svg>
    );
  case "TEXTO":
  default:
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h12M10 5v11M7 16h6" />
      </svg>
    );
  }
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
  const rotate90 = () => {
    // Intercambiar ancho y alto manteniendo el centro visual en su lugar
    const oldW = item.ancho;
    const oldH = item.alto;
    const newW = oldH;
    const newH = oldW;
    const cx = item.pos_x + oldW / 2;
    const cy = item.pos_y + oldH / 2;
    const newX = Math.max(0, Math.min(state.width - newW, snap(cx - newW / 2)));
    const newY = Math.max(0, Math.min(state.height - newH, snap(cy - newH / 2)));

    update({
      ancho: newW,
      alto: newH,
      pos_x: newX,
      pos_y: newY,
    });
  };
  const busy = item.kind === "mesa" && item.estado !== "LIBRE";
  const itemTitle = item.kind === "mesa" ? `Mesa ${item.codigo}` : ELEMENT_NAME[item.tipo];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-tinta">Orientación y Giro</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 tabular-nums">
            {item.rotacion}°
          </span>
        </div>

        {/* Botón para girar 90° e intercambiar ancho ⇄ alto */}
        <Button
          variant="secondary"
          size="sm"
          onClick={rotate90}
          className="w-full justify-center gap-2 font-bold text-azul"
          title="Gira 90° intercambiando el ancho y alto del elemento"
        >
          <span className="text-base font-normal">⤹</span> Girar 90° (Ancho ⇄ Alto)
        </Button>

        {/* Botones de ajuste fino */}
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => rotate(-15)}
            className="flex-1 text-xs"
            title="Girar 15° antihorario"
          >
            ↺ -15°
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => rotate(15)}
            className="flex-1 text-xs"
            title="Girar 15° horario"
          >
            ↻ +15°
          </Button>
          {item.rotacion !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ rotacion: 0 })}
              className="text-xs text-slate-500"
              title="Restablecer a 0°"
            >
              0°
            </Button>
          )}
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
  const PRESETS = [
    { label: "800×600", w: 800, h: 600 },
    { label: "1000×700", w: 1000, h: 700 },
    { label: "1200×800", w: 1200, h: 800 },
    { label: "1400×900", w: 1400, h: 900 },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
      aria-label="Dimensiones del salón"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-azul">
            <Icon name="cuadricula" className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Dimensiones del salón
          </h4>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
          {width} × {height}
        </span>
      </div>

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

      {/* Botones de tamaño preestablecido */}
      <div>
        <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Tamaños estándar
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => {
            const active = width === p.w && height === p.h;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => dispatch({ type: "resize-room", width: p.w, height: p.h })}
                className={`rounded-lg border px-2 py-1 text-center text-[11px] font-bold tabular-nums transition-all ${
                  active
                    ? "border-azul bg-azul/10 text-azul shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] leading-relaxed font-medium text-slate-400">
        <span>💡</span>
        <span>El salón se adapta automáticamente al monitor o tablet.</span>
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
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "properties" ? "bg-white text-azul shadow-xs" : "text-slate-500 hover:text-azul"
            }`}
          >
            <span>{item.kind === "mesa" ? `Mesa ${item.codigo}` : ELEMENT_NAME[item.tipo]}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("palette")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
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
        <ToolPalette />
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
      <div className="relative">
        <Input
          key={value}
          type="number"
          inputMode="numeric"
          defaultValue={Math.round(value)}
          min={min}
          max={max}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => event.key === "Enter" && commit(event.currentTarget)}
          className="h-9 rounded-xl pr-7 text-sm font-semibold tabular-nums"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
          px
        </span>
      </div>
    </label>
  );
}
