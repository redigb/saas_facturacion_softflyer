import { z } from "zod";

const money = z.string().regex(/^-?\d+\.\d{2}$/);
const percent = z.number().nullable();

export const analyticsSchema = z.object({
  rango: z.object({
    desde: z.string(),
    hasta: z.string(),
    agrupar: z.enum(["dia", "mes", "anio"]),
    comparacion: z.object({ desde: z.string(), hasta: z.string() }),
  }),
  kpis: z.object({
    ventas: money,
    ventas_centavos: z.number(),
    ordenes: z.number(),
    ticket_promedio: money,
    ticket_centavos: z.number(),
    platos: z.number(),
    igv: money,
    propinas: money,
  }),
  comparacion: z.object({
    ventas_pct: percent,
    ordenes_pct: percent,
    ticket_pct: percent,
    platos_pct: percent,
  }),
  serie: z.array(z.object({ periodo: z.string(), etiqueta: z.string(), ventas: money, ordenes: z.number() })),
  por_anio: z.array(z.object({ anio: z.number(), ventas: money, ordenes: z.number() })),
  top_platos: z.array(
    z.object({ producto_id: z.number(), nombre: z.string(), cantidad: z.string(), ventas: money, participacion: z.number() }),
  ),
  top_categorias: z.array(
    z.object({ categoria_id: z.number().nullable(), nombre: z.string(), cantidad: z.string(), ventas: money }),
  ),
  por_metodo: z.array(z.object({ codigo: z.string(), nombre: z.string(), ventas: money, cantidad: z.number() })),
  por_cobrador: z.array(z.object({ usuario_id: z.number(), nombre: z.string(), ventas: money, ordenes: z.number() })),
  por_sucursal: z.array(z.object({ sucursal_id: z.number(), nombre: z.string(), ventas: money, ordenes: z.number() })),
  por_hora: z.array(z.object({ hora: z.string(), ventas: money, ordenes: z.number() })),
  por_dia_semana: z.array(z.object({ dia: z.number(), etiqueta: z.string(), ventas: money, ordenes: z.number() })),
  anios: z.array(z.number()),
  sucursales: z.array(z.object({ id: z.number(), nombre: z.string() })),
});

export type Analytics = z.infer<typeof analyticsSchema>;
export type AnalyticsFilters = {
  desde: string;
  hasta: string;
  sucursalId: number | null;
  agrupar?: "dia" | "mes" | "anio";
};
