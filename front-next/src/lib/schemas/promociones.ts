import { z } from "zod";

const decimal = z.string().regex(/^\d+\.\d{2}$/);

const scopeItem = z.object({ id: z.number(), nombre: z.string() });

export const promotionStates = ["VIGENTE", "PROGRAMADA", "VENCIDA", "INACTIVA", "FUERA_DE_VENTANA"] as const;

export const promotionSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.enum(["PORCENTAJE", "PRECIO_FIJO"]),
  valor: decimal,
  desde: z.string(),
  hasta: z.string(),
  dias_semana: z.array(z.number()),
  hora_inicio: z.string().nullable(),
  hora_fin: z.string().nullable(),
  prioridad: z.number(),
  es_activa: z.boolean(),
  aplica_ahora: z.boolean(),
  estado: z.enum(promotionStates),
  productos: z.array(scopeItem),
  categorias: z.array(scopeItem),
  alcance: z.enum(["PRODUCTOS", "CATEGORIAS", "MIXTO"]),
});

export type Promotion = z.infer<typeof promotionSchema>;

export type PromotionBody = {
  nombre: string;
  descripcion: string | null;
  tipo: "PORCENTAJE" | "PRECIO_FIJO";
  valor: string;
  desde: string;
  hasta: string;
  dias_semana: number[];
  hora_inicio: string | null;
  hora_fin: string | null;
  prioridad: number;
  es_activa: boolean;
  producto_ids: number[];
  categoria_ids: number[];
};

export const WEEKDAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const;

export const STATE_LABELS: Record<(typeof promotionStates)[number], { label: string; tone: "success" | "info" | "warning" | "neutral" | "danger" }> = {
  VIGENTE: { label: "Vigente", tone: "success" },
  PROGRAMADA: { label: "Programada", tone: "info" },
  FUERA_DE_VENTANA: { label: "Fuera de horario", tone: "warning" },
  VENCIDA: { label: "Vencida", tone: "neutral" },
  INACTIVA: { label: "Inactiva", tone: "neutral" },
};

export function promotionValue(promotion: Pick<Promotion, "tipo" | "valor">): string {
  return promotion.tipo === "PORCENTAJE" ? `-${Number(promotion.valor)}%` : `S/ ${promotion.valor}`;
}
