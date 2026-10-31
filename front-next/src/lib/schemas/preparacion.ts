import { z } from "zod";

const preparationProductSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  tipo: z.enum(["PLATO", "BEBIDA"]),
  categoria: z.string().nullable(),
  imagen_url: z.string().nullable(),
});

export const preparationSummarySchema = z.object({
  producto: preparationProductSchema,
  completa: z.boolean(),
  actualizado_en: z.string().nullable(),
});

export const preparationSchema = z.object({
  producto: preparationProductSchema,
  estacion: z.object({ id: z.union([z.number(), z.literal("general")]), nombre: z.string() }),
  ingredientes: z.array(z.object({ nombre: z.string(), cantidad: z.string().nullable(), unidad: z.enum(["ONZ", "ML", "GR", "KG"]).nullable() })),
  procedimiento: z.string().nullable(),
  notas: z.string().nullable(),
  actualizado_por: z.string().nullable(),
  actualizado_en: z.string().nullable(),
});

export type PreparationSummary = z.infer<typeof preparationSummarySchema>;
export type Preparation = z.infer<typeof preparationSchema>;
export type PreparationIngredient = Preparation["ingredientes"][number];
