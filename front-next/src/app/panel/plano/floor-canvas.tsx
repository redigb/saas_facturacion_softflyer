"use client";

import { useEffect, useRef, useState } from "react";

import { GRID, snap, type EditorAction, type FloorItem } from "@/app/panel/plano/editor-state";
import type { ElementType, TableShape } from "@/lib/schemas/plano";

export type DropPayload =
  | { kind: "mesa"; forma: TableShape; ancho: number; alto: number; capacidad: number }
  | { kind: "elemento"; tipo: ElementType; ancho: number; alto: number };

type Props = {
  width: number;
  height: number;
  items: FloorItem[];
  selected: string | null;
  errors: Record<string, string>;
  editable: boolean;
  dispatch: (action: EditorAction) => void;
  onTableClick?: (item: FloorItem) => void;
  onDropItem?: (payload: DropPayload, coords: { x: number; y: number }) => void;
};

type Gesture = { key: string; mode: "move" | "resize"; startX: number; startY: number; origin: FloorItem };

// Área táctil del tirador de tamaño en píxeles de pantalla (Doc. softflyer-ui: 44px).
const HANDLE_PX = 44;

/**
 * Lienzo del salón en unidades del plano (Doc. 08 §7): el `viewBox` es el tamaño del
 * salón y el SVG se escala al ancho disponible, igual en PC, tablet o celular.
 */
export function FloorCanvas({
  width,
  height,
  items,
  selected,
  errors,
  editable,
  dispatch,
  onTableClick,
  onDropItem,
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  // Píxeles de pantalla por unidad del plano: el tirador mide 44px se vea como se vea el salón.
  const [scale, setScale] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(element.getScreenCTM()?.a ?? 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const matrix = svg.current?.getScreenCTM();
    if (!svg.current || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function toCanvas(event: React.PointerEvent): { x: number; y: number } {
    return toCanvasPoint(event.clientX, event.clientY);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    if (!editable) return;
    const data = event.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const payload = JSON.parse(data) as DropPayload;
      const coords = toCanvasPoint(event.clientX, event.clientY);
      onDropItem?.(payload, coords);
    } catch {
      // Ignorar json inválido
    }
  }

  function start(event: React.PointerEvent, item: FloorItem, mode: Gesture["mode"]) {
    event.stopPropagation();
    dispatch({ type: "select", key: item.key });
    if (!editable) {
      onTableClick?.(item);
      return;
    }
    const { x, y } = toCanvas(event);
    gesture.current = { key: item.key, mode, startX: x, startY: y, origin: item };
    dispatch({ type: "checkpoint" });
    svg.current?.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent) {
    const current = gesture.current;
    if (!current) return;
    const { x, y } = toCanvas(event);
    const dx = x - current.startX;
    const dy = y - current.startY;
    const { origin } = current;

    if (current.mode === "move") {
      dispatch({
        type: "update",
        key: current.key,
        patch: {
          pos_x: clamp(snap(origin.pos_x + dx), 0, Math.max(0, width - Math.min(origin.ancho, width))),
          pos_y: clamp(snap(origin.pos_y + dy), 0, Math.max(0, height - Math.min(origin.alto, height))),
        },
      });
    } else {
      dispatch({
        type: "update",
        key: current.key,
        patch: {
          ancho: clamp(snap(origin.ancho + dx), GRID, width),
          alto: clamp(snap(origin.alto + dy), GRID, height),
        },
      });
    }
  }

  function end(event: React.PointerEvent) {
    if (gesture.current && svg.current?.hasPointerCapture(event.pointerId)) {
      svg.current.releasePointerCapture(event.pointerId);
    }
    gesture.current = null;
  }

  // Los elementos se dibujan debajo de las mesas, en el orden de su capa.
  const ordered = [...items].sort((a, b) => layer(a) - layer(b));
  const selectedItem = items.find((item) => item.key === selected);
  const handle = HANDLE_PX / scale;

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto w-full touch-none rounded-xl border bg-white select-none transition-all ${isDragOver ? "border-azul ring-4 ring-azul/30 shadow-lg" : "border-slate-200"
        } ${editable ? "" : "cursor-default"}`}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerDown={() => dispatch({ type: "select", key: null })}
      onDragOver={(event) => {
        if (editable) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      role="img"
      aria-label="Plano del salón"
    >
      <defs>
        <pattern id="cuadricula" width={GRID * 5} height={GRID * 5} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}`} className="fill-none stroke-slate-100" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#cuadricula)" />

      {isDragOver && (
        <rect
          width={width}
          height={height}
          strokeWidth={3}
          strokeDasharray="12 8"
          className="pointer-events-none animate-pulse fill-azul/5 stroke-azul"
        />
      )}

      {ordered.map((item) => (
        <g
          key={item.key}
          transform={`translate(${item.pos_x} ${item.pos_y}) rotate(${item.rotacion} ${item.ancho / 2} ${item.alto / 2})`}
          onPointerDown={(event) => start(event, item, "move")}
          className={editable ? "cursor-grab active:cursor-grabbing" : item.kind === "mesa" && onTableClick ? "cursor-pointer" : ""}
        >
          {item.kind === "mesa" ? <TableShapeView item={item} error={!!errors[item.key]} /> : <ElementShape item={item} error={!!errors[item.key]} />}
          {item.key === selected && (
            <rect x={-4} y={-4} width={item.ancho + 8} height={item.alto + 8} rx={10} className="pointer-events-none fill-none stroke-celeste" strokeWidth={3} strokeDasharray="8 5" />
          )}
        </g>
      ))}

      {editable && selectedItem && (
        <g transform={`translate(${selectedItem.pos_x + selectedItem.ancho} ${selectedItem.pos_y + selectedItem.alto})`}>
          <rect
            x={-handle / 2}
            y={-handle / 2}
            width={handle}
            height={handle}
            className="cursor-nwse-resize fill-transparent"
            onPointerDown={(event) => start(event, selectedItem, "resize")}
          />
          <rect x={-7} y={-7} width={14} height={14} rx={3} className="pointer-events-none fill-white stroke-azul" strokeWidth={2.5} />
        </g>
      )}
    </svg>
  );
}

const STATE_STYLE: Record<string, string> = {
  LIBRE: "fill-white stroke-azul",
  OCUPADA: "fill-amarillo/40 stroke-amarillo",
  POR_COBRAR: "fill-celeste/20 stroke-celeste",
  BLOQUEADA: "fill-slate-100 stroke-slate-400",
};

function TableShapeView({ item, error }: { item: Extract<FloorItem, { kind: "mesa" }>; error: boolean }) {
  const style = error ? "fill-red-50 stroke-red-500" : STATE_STYLE[item.estado];
  const fontSize = Math.max(14, Math.min(item.ancho, item.alto) / 4);

  return (
    <>
      {item.forma === "REDONDA" ? (
        <ellipse cx={item.ancho / 2} cy={item.alto / 2} rx={item.ancho / 2} ry={item.alto / 2} className={style} strokeWidth={3} />
      ) : (
        <rect width={item.ancho} height={item.alto} rx={12} className={style} strokeWidth={3} />
      )}
      <text x={item.ancho / 2} y={item.alto / 2} textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-tinta font-bold" fontSize={fontSize}>
        {item.codigo}
      </text>
      <text x={item.ancho / 2} y={item.alto / 2 + fontSize} textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-slate-500" fontSize={fontSize * 0.6}>
        {item.capacidad} pers.
      </text>
    </>
  );
}

const ELEMENT_STYLE: Record<string, string> = {
  BARRA: "fill-azul/15 stroke-azul/60",
  PARED: "fill-tinta stroke-tinta",
  PUERTA: "fill-amarillo stroke-amarillo",
  VENTANA: "fill-celeste/40 stroke-celeste",
  COLUMNA: "fill-slate-300 stroke-slate-400",
  PLANTA: "fill-emerald-100 stroke-emerald-500",
  BANO: "fill-slate-100 stroke-slate-400",
  CAJA: "fill-azul/10 stroke-azul",
  COCINA: "fill-slate-200 stroke-slate-500",
  TEXTO: "fill-transparent stroke-transparent",
};

const ELEMENT_LABEL: Record<string, string> = {
  BARRA: "Barra",
  PARED: "",
  PUERTA: "",
  VENTANA: "",
  COLUMNA: "",
  PLANTA: "",
  BANO: "Baños",
  CAJA: "Caja",
  COCINA: "Cocina",
  TEXTO: "Texto",
};

function ElementShape({ item, error }: { item: Extract<FloorItem, { kind: "elemento" }>; error: boolean }) {
  const label = item.etiqueta ?? ELEMENT_LABEL[item.tipo];
  const thin = Math.min(item.ancho, item.alto) < 30;
  const fontSize = Math.max(13, Math.min(22, Math.min(item.ancho, item.alto) / 3));

  return (
    <>
      {item.tipo === "PLANTA" || item.tipo === "COLUMNA" ? (
        <ellipse cx={item.ancho / 2} cy={item.alto / 2} rx={item.ancho / 2} ry={item.alto / 2} className={error ? "fill-red-50 stroke-red-500" : ELEMENT_STYLE[item.tipo]} strokeWidth={2} />
      ) : (
        <rect width={item.ancho} height={item.alto} rx={thin ? 2 : 8} className={error ? "fill-red-50 stroke-red-500" : ELEMENT_STYLE[item.tipo]} strokeWidth={2} />
      )}
      {label && !thin && (
        <text x={item.ancho / 2} y={item.alto / 2} textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-tinta font-semibold" fontSize={fontSize}>
          {label}
        </text>
      )}
    </>
  );
}

function layer(item: FloorItem): number {
  return item.kind === "mesa" ? 1000 : item.capa;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
