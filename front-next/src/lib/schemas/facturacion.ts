import { z } from "zod";

// Contrato de specs/017a-configuracion-fiscal/backend.md. Si la API cambia, se cambia primero la spec.

export const igvRateSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  tasa: z.number(),
});

export const fiscalStatusSchema = z.object({
  certificado: z
    .object({
      titular: z.string().nullable(),
      vence_en: z.string(),
      vigente: z.boolean(),
      dias_restantes: z.number(),
    })
    .nullable(),
  usuario_sol: z.string().nullable(),
  tiene_clave_sol: z.boolean(),
  homologado: z.boolean(),
  entorno: z.enum(["BETA", "PRODUCCION"]),
  tasa_igv: igvRateSchema.nullable(),
  listo_para_emitir: z.boolean(),
});

export const taxCatalogsSchema = z.object({
  tipos_afectacion_igv: z.array(z.object({ id: z.number(), codigo: z.string(), nombre: z.string() })),
});

export type FiscalStatus = z.infer<typeof fiscalStatusSchema>;
export type IgvRate = z.infer<typeof igvRateSchema>;
