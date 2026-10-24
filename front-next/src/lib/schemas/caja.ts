import { z } from "zod";

// Contrato de specs/009-caja-cobro/backend.md. Si la API cambia, se cambia primero la spec.

const money = z.string().regex(/^-?\d+\.\d{2}$/);

export const cashSessionSchema = z.object({
  id: z.number(),
  sucursal_id: z.number(),
  caja: z.object({ id: z.number(), nombre: z.string() }),
  estado: z.enum(["ABIERTA", "CERRADA"]),
  abierta_por: z.object({ id: z.number(), nombre: z.string().nullable() }),
  abierta_en: z.string(),
  monto_apertura: money,
  cerrada_en: z.string().nullable(),
  monto_cierre_declarado: money.nullable(),
  monto_cierre_calculado: money.nullable(),
  diferencia: money.nullable(),
});

const summary = z.object({
  ventas: z.object({ cantidad: z.number(), total: money }),
  ticket_promedio: money,
  ultima_venta: z.object({ monto: money, creado_en: z.string() }).nullable(),
  ventas_por_hora: z.array(z.object({ hora: z.string(), monto: money, cantidad: z.number() })),
  por_metodo: z.array(z.object({ metodo_pago_id: z.number(), codigo: z.string(), nombre: z.string(), monto: money, cantidad: z.number() })),
  ingresos: money,
  egresos: money,
  efectivo_esperado: money,
  ordenes: z.array(
    z.object({
      venta_id: z.number(),
      pedido_id: z.number().nullable(),
      numero: z.number().nullable(),
      tipo: z.string().nullable(),
      mesa: z.string().nullable(),
      cliente: z.string().nullable(),
      items: z.number(),
      metodos_pago: z.array(z.string()),
      total: money,
      cobrado_por: z.string().nullable(),
      creado_en: z.string(),
    }),
  ),
});

export const cashSummarySchema = cashSessionSchema.extend({
  resumen: summary,
  movimientos: z
    .array(z.object({ id: z.number(), tipo: z.enum(["INGRESO", "EGRESO"]), monto: money, concepto: z.string(), categoria: z.string().nullable(), creado_en: z.string().nullable() }))
    .default([]),
});

export const closedSessionSchema = cashSessionSchema.extend({ resumen: summary });

export const paymentMethodSchema = z.object({ id: z.number(), codigo: z.string(), nombre: z.string(), es_efectivo: z.boolean() });

export const movementSchema = z.object({ id: z.number(), tipo: z.enum(["INGRESO", "EGRESO"]), monto: money, concepto: z.string(), categoria: z.string().nullable(), efectivo_esperado: money });

export const cashHistorySchema = z.array(cashSessionSchema.extend({ resumen: summary }));

export const receiptSchema = z.object({
  id: z.number(),
  venta_id: z.number(),
  tipo: z.string(),
  serie: z.string(),
  correlativo: z.number(),
  numero: z.string(),
  estado: z.string(),
  es_simulado: z.boolean(),
  emitido_en: z.string(),
  empresa: z.object({ razon_social: z.string().nullable(), ruc: z.string().nullable(), nombre_comercial: z.string().nullable(), direccion: z.string().nullable() }),
  cliente: z.object({ tipo_documento: z.string(), numero: z.string().nullable(), nombre: z.string() }),
  op_gravada: money,
  igv: money,
  total: money,
  lineas: z.array(z.object({ descripcion: z.string(), cantidad: z.string(), precio_unitario: money, total: money })),
  pagos: z.array(z.object({ metodo: z.string(), monto: money })),
});

export const chargeResultSchema = z.object({
  comprobante: receiptSchema,
  venta: z.object({ id: z.number(), total: money, igv: money, estado: z.string() }),
  pagos: z.array(z.object({ id: z.number(), metodo_pago_id: z.number(), monto: money, monto_recibido: money.nullable(), vuelto: money, referencia: z.string().nullable() })),
  vuelto: money,
  pedido: z.object({ id: z.number(), estado: z.enum(["ABIERTO", "POR_COBRAR", "CERRADO", "ANULADO"]), version: z.number(), pendiente: money }),
});

export type CashSession = z.infer<typeof cashSessionSchema>;
export type CashSummary = z.infer<typeof cashSummarySchema>;
export type CashHistoryItem = z.infer<typeof cashHistorySchema>[number];
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type ChargeResult = z.infer<typeof chargeResultSchema>;
export type Receipt = z.infer<typeof receiptSchema>;

/** Datos opcionales del cliente al cobrar (spec 010). */
export type CustomerDraft = { tipo_documento: "DNI" | "RUC"; numero: string; nombre: string };

/** Un pago que el cajero está armando; los montos son texto del input. */
export type PaymentDraft = { key: string; metodo_pago_id: number; monto: string; monto_recibido: string; referencia: string };

/** Montos en céntimos: sumar y comparar sin errores de coma flotante. */
export const toCents = (amount: string | number | null | undefined): number => Math.round(Number(amount ?? 0) * 100);
export const fromCents = (cents: number): string => (cents / 100).toFixed(2);
