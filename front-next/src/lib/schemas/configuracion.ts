import { z } from "zod";

// Contrato de specs/011-empresa-sucursales/backend.md. Si la API cambia, se cambia primero la spec.

export const ubigeoSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  departamento: z.string(),
  provincia: z.string(),
  distrito: z.string(),
});

export const companySchema = z.object({
  id: z.number(),
  ruc: z.string().nullable(),
  razon_social: z.string().nullable(),
  nombre_comercial: z.string(),
  direccion_fiscal: z.string().nullable(),
  ubigeo: ubigeoSchema.nullable(),
  homologado: z.boolean(),
});

export const branchSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  direccion: z.string().nullable(),
  ubigeo: ubigeoSchema.nullable(),
  codigo_establecimiento: z.string(),
  es_principal: z.boolean(),
  es_activa: z.boolean(),
});

export const branchesResponseSchema = z.object({
  data: z.array(branchSchema),
  meta: z.object({ activas: z.number(), max_sucursales: z.number().nullable() }),
});

export type Ubigeo = z.infer<typeof ubigeoSchema>;
export type Company = z.infer<typeof companySchema>;
export type Branch = z.infer<typeof branchSchema>;

/** "Miraflores, Lima, Lima": el distrito primero, que es lo que se busca. */
export function ubigeoLabel(ubigeo: Ubigeo): string {
  const title = (text: string) => text.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

  return [ubigeo.distrito, ubigeo.provincia, ubigeo.departamento].map(title).join(", ");
}

export const companyFormSchema = z.object({
  ruc: z.string().trim().regex(/^\d{11}$/, "El RUC tiene 11 dígitos."),
  razon_social: z.string().trim().min(3, "Escribe la razón social completa.").max(200),
  nombre_comercial: z.string().trim().min(2, "Escribe el nombre comercial.").max(120),
  direccion_fiscal: z.string().trim().max(250),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const branchFormSchema = z.object({
  nombre: z.string().trim().min(2, "Ponle un nombre a la sucursal.").max(100),
  direccion: z.string().trim().max(250),
  codigo_establecimiento: z.string().trim().regex(/^(\d{4})?$/, "El código tiene 4 dígitos."),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
