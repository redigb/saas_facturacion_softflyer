"use client";

import { useEffect, useRef, useState } from "react";

import { GRID, snap, type EditorAction, type FloorItem } from "@/app/panel/plano/editor-state";
import { ArchitecturalElementView, ArchitecturalTableView } from "@/app/panel/plano/floor-shapes";
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

type Gesture = {
  key: string;
  mode: "move" | "resize" | "rotate";
  startX: number;
  startY: number;
  origin: FloorItem;
};

// Área táctil del tirador de tamaño en píxeles de pantalla (Doc. softflyer-ui: 44px).
const HANDLE_PX = 44;

/**
 * Lienzo del salón en unidades del plano (Doc. 08 §7): el `viewBox` es el tamaño del
 * salón y el SVG se escala al ancho disponible, con soporte para rotación lúcida y tiradores interactivos.
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
          pos_x: clamp(snap(origin.pos_x + dx), 0, Math.max(0, width - origin.ancho)),
          pos_y: clamp(snap(origin.pos_y + dy), 0, Math.max(0, height - origin.alto)),
        },
      });
    } else if (current.mode === "resize") {
      // Convertir el vector del ratón al marco de coordenadas local del elemento según su ángulo
      const rad = (-origin.rotacion * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const localDx = dx * cos - dy * sin;
      const localDy = dx * sin + dy * cos;

      dispatch({
        type: "update",
        key: current.key,
        patch: {
          ancho: clamp(snap(origin.ancho + localDx), GRID * 2, width),
          alto: clamp(snap(origin.alto + localDy), GRID * 2, height),
        },
      });
    } else if (current.mode === "rotate") {
      // Calcular ángulo relativo al centro del elemento
      const cx = origin.pos_x + origin.ancho / 2;
      const cy = origin.pos_y + origin.alto / 2;
      const rad = Math.atan2(y - cy, x - cx);
      let deg = (rad * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      deg = deg % 360;

      // Imán magnético a ángulos cardinales
      const cardinals = [0, 45, 90, 135, 180, 225, 270, 315, 360];
      const close = cardinals.find((card) => Math.abs(deg - card) <= 5);
      const snappedAngle = close !== undefined ? (close === 360 ? 0 : close) : Math.round(deg / 5) * 5;

      dispatch({
        type: "update",
        key: current.key,
        patch: { rotacion: snappedAngle },
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
  const handle = HANDLE_PX / scale;

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto w-full touch-none rounded-xl border bg-white select-none transition-all ${
        isDragOver ? "border-azul ring-4 ring-azul/30 shadow-lg" : "border-slate-200"
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

      {ordered.map((item) => {
        const isSelected = item.key === selected;

        return (
          <g
            key={item.key}
            transform={`translate(${item.pos_x} ${item.pos_y}) rotate(${item.rotacion} ${item.ancho / 2} ${item.alto / 2})`}
            onPointerDown={(event) => start(event, item, "move")}
            className={editable ? "cursor-grab active:cursor-grabbing" : item.kind === "mesa" && onTableClick ? "cursor-pointer" : ""}
          >
            {/* Representación visual lúcida y arquitectónica */}
            {item.kind === "mesa" ? (
              <ArchitecturalTableView item={item} error={!!errors[item.key]} />
            ) : (
              <ArchitecturalElementView item={item} error={!!errors[item.key]} />
            )}

            {/* Borde de selección contextual que rota con el elemento */}
            {isSelected && (
              <rect
                x={-4}
                y={-4}
                width={item.ancho + 8}
                height={item.alto + 8}
                rx={8}
                className="pointer-events-none fill-none stroke-celeste"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
            )}

            {/* Tirador de cambio de tamaño (esquina inferior derecha del marco local) */}
            {editable && isSelected && (
              <g transform={`translate(${item.ancho} ${item.alto})`} className="cursor-nwse-resize">
                <circle
                  r={handle / 2}
                  fill="transparent"
                  onPointerDown={(event) => start(event, item, "resize")}
                />
                <rect
                  x={-7}
                  y={-7}
                  width={14}
                  height={14}
                  rx={3}
                  className="pointer-events-none fill-white stroke-azul shadow-xs"
                  strokeWidth={2.5}
                />
              </g>
            )}

            {/* Tirador de rotación interactivo (arriba del centro del marco local) */}
            {editable && isSelected && (
              <g transform={`translate(${item.ancho / 2} 0)`} className="cursor-grab active:cursor-grabbing">
                {/* Tallo conector hacia la perilla de giro */}
                <line
                  x1={0}
                  y1={-4}
                  x2={0}
                  y2={-26 / scale}
                  stroke="#0284c7"
                  strokeWidth={1.6}
                  strokeDasharray="3 3"
                  className="pointer-events-none"
                />
                {/* Perilla circular de giro */}
                <circle
                  cy={-26 / scale}
                  r={handle / 2}
                  fill="transparent"
                  onPointerDown={(event) => start(event, item, "rotate")}
                />
                <circle
                  cy={-26 / scale}
                  r={7}
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  className="pointer-events-none shadow-sm"
                />
                <circle
                  cy={-26 / scale}
                  r={2.5}
                  fill="#0284c7"
                  className="pointer-events-none"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function layer(item: FloorItem): number {
  return item.kind === "mesa" ? 1000 : item.capa;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
