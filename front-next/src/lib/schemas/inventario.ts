import { z } from "zod";

export const warehouseSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  sucursal_id: z.number(),
  estacion_id: z.number().nullable(),
  es_principal: z.boolean(),
});

const inventoryProductSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  categoria: z.enum(["ALIMENTO", "BEBIDA", "LIMPIEZA", "EMPAQUE", "UTENSILIO", "EQUIPO", "OTRO"]),
  naturaleza: z.enum(["CONSUMIBLE", "REUTILIZABLE"]),
  unidad: z.object({ id: z.number(), codigo: z.string(), nombre: z.string() }),
  es_activo: z.boolean(),
});

export const inventoryStockSchema = z.object({
  producto: inventoryProductSchema,
  cantidad: z.number(),
  stock_minimo: z.number(),
  stock_bajo: z.boolean(),
  estado: z.object({ disponible: z.number(), danada: z.number(), perdida: z.number() }),
});

export const inventoryDashboardSchema = z.object({
  sucursal: z.object({ id: z.number(), nombre: z.string() }),
  almacenes: z.array(warehouseSchema),
  almacen_actual_id: z.number().nullable(),
  resumen: z.object({ articulos: z.number(), stock_bajo: z.number(), almacenes: z.number() }),
  existencias: z.array(inventoryStockSchema),
});

export const inventoryCatalogsSchema = z.object({
  unidades: z.array(z.object({ id: z.number(), codigo: z.string(), nombre: z.string() })),
  almacenes: z.array(warehouseSchema),
  categorias: z.array(z.enum(["ALIMENTO", "BEBIDA", "LIMPIEZA", "EMPAQUE", "UTENSILIO", "EQUIPO", "OTRO"])),
  naturalezas: z.array(z.enum(["CONSUMIBLE", "REUTILIZABLE"])),
});

export const inventoryMovementSchema = z.object({
  id: z.number(),
  producto_id: z.number(),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE", "MERMA"]),
  sentido: z.enum(["ENTRADA", "SALIDA"]),
  cantidad: z.number(),
  saldo_anterior: z.number(),
  saldo_resultante: z.number(),
  motivo: z.string(),
  estado_anterior: z.record(z.string(), z.number()).nullable(),
  estado_resultante: z.record(z.string(), z.number()).nullable(),
  usuario: z.object({ id: z.number(), nombre: z.string() }).nullable(),
  creado_en: z.string(),
});

export const inventoryOperationSchema = z.object({
  existencia: inventoryStockSchema,
  movimiento: inventoryMovementSchema,
});

export const inventoryLedgerSchema = z.object({
  movimientos: z.array(inventoryMovementSchema),
  siguiente_cursor: z.number().nullable(),
});

export type InventoryStock = z.infer<typeof inventoryStockSchema>;
export type InventoryCatalogs = z.infer<typeof inventoryCatalogsSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;
