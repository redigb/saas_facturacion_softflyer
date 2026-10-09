import type { ElementType, Plan, PlanBody, TableShape } from "@/lib/schemas/plano";

/** Mesa o elemento en el lienzo. `key` identifica el objeto aunque todavía no tenga id. */
export type FloorItem =
  | {
      key: string;
      kind: "mesa";
      id?: number;
      codigo: string;
      capacidad: number;
      forma: TableShape;
      estado: "LIBRE" | "OCUPADA" | "POR_COBRAR" | "BLOQUEADA";
      pos_x: number;
      pos_y: number;
      ancho: number;
      alto: number;
      rotacion: number;
    }
  | {
      key: string;
      kind: "elemento";
      tipo: ElementType;
      etiqueta: string | null;
      capa: number;
      pos_x: number;
      pos_y: number;
      ancho: number;
      alto: number;
      rotacion: number;
    };

export type FloorTable = Extract<FloorItem, { kind: "mesa" }>;

export type EditorState = {
  roomId: number;
  version: number;
  width: number;
  height: number;
  items: FloorItem[];
  selected: string | null;
  /** Instantáneas para deshacer (máximo 50). */
  past: Snapshot[];
  /** Lo último guardado, para saber si hay cambios. */
  saved: string;
  /** Errores de validación del servidor por objeto. */
  errors: Record<string, string>;
};

type Snapshot = Pick<EditorState, "items" | "width" | "height">;

export type EditorAction =
  | { type: "load"; plan: Plan }
  | { type: "checkpoint" }
  | { type: "add"; item: FloorItem }
  | { type: "update"; key: string; patch: Partial<FloorItem>; record?: boolean }
  | { type: "remove"; key: string }
  | { type: "duplicate"; key: string }
  | { type: "select"; key: string | null }
  | { type: "resize-room"; width: number; height: number }
  | { type: "restore"; items: FloorItem[] }
  | { type: "errors"; errors: Record<string, string> }
  | { type: "undo" };

export const GRID = 10;

let sequence = 0;
export const newKey = () => `nuevo-${++sequence}`;

export function fromPlan(plan: Plan): EditorState {
  const items: FloorItem[] = [
    ...plan.elementos.map((element) => ({ ...element, key: `e${element.id}`, kind: "elemento" as const })),
    ...plan.mesas.map((table) => ({ ...table, key: `m${table.id}`, kind: "mesa" as const })),
  ];
  const state = { roomId: plan.salon.id, version: plan.salon.version, width: plan.salon.ancho, height: plan.salon.alto, items };

  return { ...state, selected: null, past: [], errors: {}, saved: fingerprint(state) };
}

export function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return fromPlan(action.plan);
    case "checkpoint":
      return remember(state);
    case "add":
      return { ...remember(state), items: [...state.items, action.item], selected: action.item.key };
    case "update": {
      const base = action.record ? remember(state) : state;
      return {
        ...base,
        items: base.items.map((item) => (item.key === action.key ? ({ ...item, ...action.patch } as FloorItem) : item)),
        errors: omit(base.errors, action.key),
      };
    }
    case "remove":
      return { ...remember(state), items: state.items.filter((item) => item.key !== action.key), selected: null, errors: omit(state.errors, action.key) };
    case "duplicate": {
      const source = state.items.find((item) => item.key === action.key);
      if (!source) return state;
      const copy = { ...source, key: newKey(), pos_x: Math.min(source.pos_x + GRID * 3, state.width), pos_y: Math.min(source.pos_y + GRID * 3, state.height) };
      if (copy.kind === "mesa") {
        delete (copy as { id?: number }).id;
        copy.codigo = nextTableCode(state.items);
        copy.estado = "LIBRE";
      }
      return { ...remember(state), items: [...state.items, copy], selected: copy.key };
    }
    case "select":
      return { ...state, selected: action.key };
    case "resize-room":
      return { ...remember(state), width: action.width, height: action.height };
    case "restore":
      return { ...state, items: action.items };
    case "errors":
      return { ...state, errors: action.errors };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { ...state, ...previous, past: state.past.slice(0, -1), selected: previous.items.some((item) => item.key === state.selected) ? state.selected : null };
    }
  }
}

export function isDirty(state: EditorState): boolean {
  return fingerprint(state) !== state.saved;
}

/** Cuerpo del PUT en el orden del contrato. Devuelve también qué objeto es cada índice. */
export function toBody(state: EditorState): { body: PlanBody; tableKeys: string[]; elementKeys: string[] } {
  const tables = state.items.filter((item): item is FloorTable => item.kind === "mesa");
  const elements = state.items.filter((item) => item.kind === "elemento");

  return {
    body: {
      version: state.version,
      ancho: state.width,
      alto: state.height,
      mesas: tables.map(({ id, codigo, capacidad, forma, pos_x, pos_y, ancho, alto, rotacion }) => ({
        ...(id ? { id } : {}),
        codigo: codigo.trim().toUpperCase(),
        capacidad,
        forma,
        ...round({ pos_x, pos_y, ancho, alto }),
        rotacion,
      })),
      elementos: elements.map((element) => ({
        tipo: element.tipo,
        etiqueta: element.etiqueta?.trim() || null,
        capa: element.capa,
        ...round({ pos_x: element.pos_x, pos_y: element.pos_y, ancho: element.ancho, alto: element.alto }),
        rotacion: element.rotacion,
      })),
    },
    tableKeys: tables.map((table) => table.key),
    elementKeys: elements.map((element) => element.key),
  };
}

export function nextTableCode(items: FloorItem[]): string {
  const numbers = items.flatMap((item) => (item.kind === "mesa" ? [Number(/^M(\d+)$/.exec(item.codigo)?.[1] ?? 0)] : []));
  return `M${Math.max(0, ...numbers) + 1}`;
}

export const snap = (value: number) => Math.round(value / GRID) * GRID;

function remember(state: EditorState): EditorState {
  return { ...state, past: [...state.past.slice(-49), { items: state.items, width: state.width, height: state.height }] };
}

function fingerprint({ items, width, height }: Pick<EditorState, "items" | "width" | "height">): string {
  return JSON.stringify({ width, height, items: items.map((item) => Object.fromEntries(Object.entries(item).filter(([name]) => name !== "key"))) });
}

function round<T extends Record<string, number>>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Math.round(value * 100) / 100])) as T;
}

function omit(errors: Record<string, string>, key: string): Record<string, string> {
  return key in errors ? Object.fromEntries(Object.entries(errors).filter(([name]) => name !== key)) : errors;
}
