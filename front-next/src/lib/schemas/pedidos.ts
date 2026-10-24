import { z } from "zod";

// Contratos de specs/006-pedidos-mozo/backend.md y de GET /carta (specs/002-carta/backend.md).

const decimal = z.string().regex(/^\d+\.\d{2}$/);

export const menuSchema = z.object({
  version: z.string().nullable(),
  categorias: z.array(z.object({ id: z.number(), nombre: z.string(), color: z.string().nullable(), orden: z.number(), producto_ids: z.array(z.number()) })),
  productos: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      imagen_url: z.string().nullable(),
      precio_venta: decimal,
      tipo: z.enum(["PLATO", "BEBIDA"]),
      categoria_id: z.number().nullable(),
      estacion_efectiva_id: z.number().nullable(),
      modificador_grupo_ids: z.array(z.number()),
    }),
  ),
  modificador_grupos: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      seleccion_minima: z.number(),
      seleccion_maxima: z.number(),
      modificadores: z.array(z.object({ id: z.number(), nombre: z.string(), precio_adicional: decimal })),
    }),
  ),
  estaciones: z.array(z.object({ id: z.number(), nombre: z.string() })),
});

const orderHeader = {
  id: z.number(),
  numero: z.number(),
  tipo: z.enum(["SALON", "PARA_LLEVAR"]),
  estado: z.enum(["ABIERTO", "POR_COBRAR", "CERRADO", "ANULADO"]),
  version: z.number(),
  sucursal_id: z.number(),
  mesa: z.object({ id: z.number(), codigo: z.string(), salon_id: z.number() }).nullable(),
  mozo: z.object({ id: z.number(), nombre: z.string() }).nullable(),
  numero_comensales: z.number().nullable(),
  abierto_en: z.string(),
  cerrado_en: z.string().nullable(),
  total: decimal,
};

export const kitchenStates = ["PENDIENTE", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

export const orderSchema = z.object({
  ...orderHeader,
  /** Lo que falta cobrar (spec 009): con cuenta dividida es menor que `total`. */
  pendiente: decimal,
  detalles: z.array(
    z.object({
      id: z.number(),
      producto_id: z.number(),
      nombre: z.string().nullable(),
      cantidad: z.string(),
      precio_unitario: decimal,
      notas: z.string().nullable(),
      estado_cocina: z.enum(kitchenStates),
      cobrado: z.boolean(),
      comanda: z.object({ id: z.number(), numero: z.number(), estacion_preparacion_id: z.number().nullable(), enviada_en: z.string().nullable() }).nullable(),
      modificadores: z.array(z.object({ id: z.number(), nombre: z.string(), precio_adicional: decimal })),
      subtotal: decimal,
      anulado: z.object({ en: z.string(), por: z.string().nullable(), motivo: z.string().nullable() }).nullable(),
    }),
  ),
});

export const orderSummarySchema = z.object({
  ...orderHeader,
  platos: z.number(),
  pendientes: z.number(),
  listos: z.number(),
  detalles_resumen: z.array(z.object({ id: z.number(), nombre: z.string().nullable(), cantidad: z.string(), subtotal: decimal })),
});

export type Menu = z.infer<typeof menuSchema>;
export type MenuProduct = Menu["productos"][number];
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = Order["detalles"][number];
export type OrderSummary = z.infer<typeof orderSummarySchema>;

/** Un plato en el carrito local del mozo, todavía no enviado. */
export type CartLine = {
  key: string;
  producto_id: number;
  cantidad: number;
  notas: string;
  modificador_ids: number[];
};
