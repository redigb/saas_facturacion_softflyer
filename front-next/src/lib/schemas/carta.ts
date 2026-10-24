import { z } from "zod";

// Contrato de specs/002-carta/backend.md. Si la API cambia, se cambia primero la spec.

const decimal = z.string().regex(/^\d+\.\d{2}$/);
const catalogItem = z.object({ id: z.number(), codigo: z.string(), nombre: z.string() });

export const categorySchema = z.object({
  id: z.number(),
  nombre: z.string(),
  color: z.string().nullable(),
  orden: z.number(),
  es_activa: z.boolean(),
  estacion_preparacion_id: z.number().nullable(),
  productos_count: z.number(),
});

export const productSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  imagen_url: z.string().nullable(),
  tipo: z.enum(["PLATO", "BEBIDA"]),
  categoria_id: z.number().nullable(),
  precio_venta: decimal.nullable(),
  unidad_medida: catalogItem.nullable(),
  tipo_afectacion_igv: catalogItem.nullable(),
  estacion_preparacion_id: z.number().nullable(),
  estacion_efectiva_id: z.number().nullable(),
  modificador_grupo_ids: z.array(z.number()),
  es_vendible: z.boolean(),
  es_activo: z.boolean(),
});

export const stationSchema = z.object({ id: z.number(), nombre: z.string(), es_activa: z.boolean() });

export const modifierGroupSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  seleccion_minima: z.number(),
  seleccion_maxima: z.number(),
  modificadores: z.array(
    z.object({ id: z.number(), nombre: z.string(), precio_adicional: decimal, orden: z.number(), es_activo: z.boolean() }),
  ),
});

export const paginationSchema = z.object({ pagina_actual: z.number(), por_pagina: z.number(), total: z.number() });

export const dataOf = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Station = z.infer<typeof stationSchema>;
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;

// --- Formularios -----------------------------------------------------------

/** Acepta "42", "42.5" o "42,50" y lo deja como número con 2 decimales como máximo. */
export const priceInput = z
  .string()
  .trim()
  .min(1, { error: "Ingresa el precio." })
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value), { error: "Usa un precio como 42 o 42.50." });

export const productFormSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre al plato." }).max(120, { error: "Hasta 120 caracteres." }),
  precio_venta: priceInput,
  categoria_id: z.string(),
  tipo: z.enum(["PLATO", "BEBIDA"]),
  descripcion: z.string().max(255, { error: "Hasta 255 caracteres." }),
  estacion_preparacion_id: z.string(),
  modificador_grupo_ids: z.array(z.number()),
});

export type ProductFormValues = z.input<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre a la categoría." }).max(80, { error: "Hasta 80 caracteres." }),
  color: z.string(),
  estacion_preparacion_id: z.string(),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;

export const modifierGroupFormSchema = z
  .object({
    nombre: z.string().trim().min(1, { error: "Ponle un nombre al grupo." }).max(60),
    seleccion_minima: z.coerce.number().int().min(0),
    seleccion_maxima: z.coerce.number().int().min(1, { error: "Debe ser al menos 1." }),
    modificadores: z
      .array(
        z.object({
          id: z.number().optional(),
          nombre: z.string().trim().min(1, { error: "Ponle un nombre." }).max(60),
          precio_adicional: z
            .string()
            .trim()
            .transform((value) => value.replace(",", ".") || "0")
            .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value), { error: "Precio inválido." }),
        }),
      )
      .min(1, { error: "Agrega al menos una opción." }),
  })
  .refine((group) => group.seleccion_minima <= group.seleccion_maxima, {
    error: "El mínimo no puede ser mayor que el máximo.",
    path: ["seleccion_minima"],
  });

export type ModifierGroupFormValues = z.input<typeof modifierGroupFormSchema>;

export function formatPrice(value: string | null): string {
  return value === null ? "—" : `S/ ${Number(value).toFixed(2)}`;
}
