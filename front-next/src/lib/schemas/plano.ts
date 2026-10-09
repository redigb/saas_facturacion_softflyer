import { z } from "zod";

// Contrato de specs/003-plano/backend.md. Si la API cambia, se cambia primero la spec.

export const TABLE_SHAPES = ["CUADRADA", "REDONDA", "RECTANGULAR"] as const;
export const ELEMENT_TYPES = ["BARRA", "PARED", "PUERTA", "VENTANA", "COLUMNA", "PLANTA", "BANO", "CAJA", "COCINA", "TEXTO"] as const;

export type TableShape = (typeof TABLE_SHAPES)[number];
export type ElementType = (typeof ELEMENT_TYPES)[number];

export const roomSchema = z.object({
  id: z.number(),
  sucursal_id: z.number(),
  nombre: z.string(),
  ancho: z.number(),
  alto: z.number(),
  orden: z.number(),
  version: z.number(),
  es_activo: z.boolean(),
  mesas_count: z.number(),
});

const geometry = {
  pos_x: z.number(),
  pos_y: z.number(),
  ancho: z.number(),
  alto: z.number(),
  rotacion: z.number(),
};

export const tableSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  capacidad: z.number(),
  forma: z.enum(TABLE_SHAPES),
  estado: z.enum(["LIBRE", "OCUPADA", "POR_COBRAR", "BLOQUEADA"]),
  ...geometry,
});

export const elementSchema = z.object({
  id: z.number(),
  tipo: z.enum(ELEMENT_TYPES),
  etiqueta: z.string().nullable(),
  capa: z.number(),
  ...geometry,
});

export const planSchema = z.object({
  salon: z.object({ id: z.number(), nombre: z.string(), ancho: z.number(), alto: z.number(), version: z.number() }),
  mesas: z.array(tableSchema),
  elementos: z.array(elementSchema),
});

export type Room = z.infer<typeof roomSchema>;
export type Plan = z.infer<typeof planSchema>;
export type PlanTable = z.infer<typeof tableSchema>;
export type PlanElement = z.infer<typeof elementSchema>;

/** Cuerpo de PUT /salones/{id}/plano. */
export type PlanBody = {
  version: number;
  ancho: number;
  alto: number;
  mesas: (Omit<PlanTable, "id" | "estado"> & { id?: number })[];
  elementos: (Omit<PlanElement, "id">)[];
};
