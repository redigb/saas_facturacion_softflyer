import { z } from "zod";

import { kitchenStates } from "@/lib/schemas/pedidos";

// Contrato de specs/007-cocina-kds/backend.md: sin precios, la cocina no los necesita.

export const ticketSchema = z.object({
  id: z.number(),
  numero: z.number(),
  estacion_preparacion_id: z.number().nullable(),
  enviada_en: z.string(),
  enviada_por: z.string().nullable(),
  impresa_en: z.string().nullable(),
  completa: z.boolean(),
  pedido: z.object({
    id: z.number(),
    numero: z.number(),
    tipo: z.enum(["SALON", "PARA_LLEVAR"]),
    mesa: z.string().nullable(),
    estado: z.string(),
  }),
  detalles: z.array(
    z.object({
      id: z.number(),
      nombre: z.string().nullable(),
      cantidad: z.string(),
      notas: z.string().nullable(),
      modificadores: z.array(z.string()),
      estado_cocina: z.enum(kitchenStates),
      anulado: z.boolean(),
    }),
  ),
});

export type Ticket = z.infer<typeof ticketSchema>;
export type KitchenState = (typeof kitchenStates)[number];

/** Siguiente estado al tocar un plato en el KDS: en cola → preparando → listo. */
export function nextKitchenState(state: KitchenState): "EN_PREPARACION" | "LISTO" | null {
  return state === "PENDIENTE" ? "EN_PREPARACION" : state === "EN_PREPARACION" ? "LISTO" : null;
}
