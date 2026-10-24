"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import {
  inventoryCatalogsSchema,
  inventoryDashboardSchema,
  inventoryLedgerSchema,
  inventoryOperationSchema,
  inventoryStockSchema,
} from "@/lib/schemas/inventario";

const keys = {
  root: ["inventario"] as const,
  dashboard: (branchId: number, warehouseId: number | null) => ["inventario", "resumen", branchId, warehouseId] as const,
  catalogs: (branchId: number) => ["inventario", "catalogos", branchId] as const,
  ledger: (warehouseId: number, productId: number) => ["inventario", "kardex", warehouseId, productId] as const,
};

export function useInventory(branchId: number, warehouseId: number | null) {
  const suffix = warehouseId ? `&almacen_id=${warehouseId}` : "";
  return useQuery({
    queryKey: keys.dashboard(branchId, warehouseId),
    queryFn: async () => (await apiRequest(`inventario?sucursal_id=${branchId}${suffix}`, dataOf(inventoryDashboardSchema))).data,
    enabled: branchId > 0,
  });
}

export function useInventoryCatalogs(branchId: number) {
  return useQuery({
    queryKey: keys.catalogs(branchId),
    queryFn: async () => (await apiRequest(`inventario/catalogos?sucursal_id=${branchId}`, dataOf(inventoryCatalogsSchema))).data,
    enabled: branchId > 0,
  });
}

export function useInventoryLedger(warehouseId: number | null, productId: number | null) {
  return useQuery({
    queryKey: keys.ledger(warehouseId ?? 0, productId ?? 0),
    queryFn: async () => (await apiRequest(`inventario/kardex?almacen_id=${warehouseId}&producto_id=${productId}`, dataOf(inventoryLedgerSchema))).data,
    enabled: warehouseId !== null && productId !== null,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest("inventario/articulos", dataOf(inventoryStockSchema), { method: "POST", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.root }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: number; body: Record<string, unknown> }) =>
      apiRequest(`inventario/articulos/${productId}`, dataOf(inventoryStockSchema), { method: "PATCH", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.root }),
  });
}

export function useInventoryMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest("inventario/movimientos", dataOf(inventoryOperationSchema), {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body,
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.root }),
  });
}

export function useInventoryCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest("inventario/conteos", dataOf(inventoryOperationSchema), {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body,
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.root }),
  });
}
