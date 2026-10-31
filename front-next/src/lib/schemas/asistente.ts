import { z } from "zod";

const money = z.string().regex(/^-?\d+\.\d{2}$/);

const period = z.object({ desde: z.string(), hasta: z.string(), etiqueta: z.string() }).nullable();

export const assistantVisualizationSchema = z
  .discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("metric"), titulo: z.string(), moneda: z.string(), valor: money }),
    z.object({
      tipo: z.literal("barras"),
      titulo: z.string(),
      moneda: z.string(),
      puntos: z.array(z.object({ etiqueta: z.string(), valor: money })),
    }),
    z.object({
      tipo: z.literal("comparacion"),
      titulo: z.string(),
      actual: z.object({ etiqueta: z.string(), valor: money }),
      anterior: z.object({ etiqueta: z.string(), valor: money }),
      variacion_pct: z.number().nullable(),
    }),
    z.object({
      tipo: z.literal("lista"),
      titulo: z.string(),
      items: z.array(z.object({ titulo: z.string(), detalle: z.string() })),
    }),
  ])
  .nullable();

export const assistantAnswerSchema = z.object({
  respuesta: z.string(),
  accion: z.string().nullable(),
  periodo: period,
  visualizacion: assistantVisualizationSchema,
  sugerencias: z.array(z.string()),
});

export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;
export type AssistantVisualization = NonNullable<AssistantAnswer["visualizacion"]>;
