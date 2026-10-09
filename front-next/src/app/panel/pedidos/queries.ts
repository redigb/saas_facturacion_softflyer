"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { menuSchema, orderSchema, orderSummarySchema, type CartLine, type Order } from "@/lib/schemas/pedidos";

export const keys = {
  menu: ["carta"] as const,
  orders: ["pedidos"] as const,
  order: (id: number) => ["pedidos", id] as const,
};

/** La carta se descarga una vez y se renueva con el aviso CartaActualizada (spec 005). */
export function useMenu() {
  return useQuery({
    queryKey: keys.menu,
    queryFn: async () => (await apiRequest("carta", dataOf(menuSchema))).data,
    staleTime: Infinity,
  });
}

export function useActiveOrders() {
  return useQuery({
    queryKey: keys.orders,
    queryFn: async () => (await apiRequest("pedidos", dataOf(z.array(orderSummarySchema)))).data,
    staleTime: 15_000,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: async () => (await apiRequest(`pedidos/${id}`, dataOf(orderSchema))).data,
  });
}

/** Abrir pedido: una clave de idempotencia por intento (doble toque = un solo pedido). */
export function useOpenOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { tipo: "SALON" | "PARA_LLEVAR"; mesa_id?: number; numero_comensales?: number }) =>
      apiRequest("pedidos", dataOf(orderSchema), { method: "POST", body, headers: { "Idempotency-Key": crypto.randomUUID() } }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(keys.order(data.id), data);
      void queryClient.invalidateQueries({ queryKey: keys.orders, exact: true });
    },
  });
}

/**
 * Enviar a cocina. La clave la genera quien llama y la conserva hasta que el envío
 * termine bien: si la red falla, el reintento usa la misma y la cocina no recibe doble.
 */
export function useSendToKitchen(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lines, key }: { lines: CartLine[]; key: string }) =>
      apiRequest(`pedidos/${orderId}/comandas`, dataOf(orderSchema), {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: {
          items: lines.map((line) => ({
            producto_id: line.producto_id,
            cantidad: line.cantidad,
            notas: line.notas.trim() || null,
            modificador_ids: line.modificador_ids,
          })),
        },
      }),
    onSuccess: ({ data }) => updateOrder(queryClient, data),
  });
}

export function useOrderAction(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, body }: { action: "cuenta" | "reabrir" | "anular" | `detalles/${number}/anular`; body?: Record<string, unknown> }) =>
      apiRequest(`pedidos/${orderId}/${action}`, dataOf(orderSchema), { method: "POST", body: body ?? {} }),
    onSuccess: ({ data }) => updateOrder(queryClient, data),
  });
}

function updateOrder(queryClient: ReturnType<typeof useQueryClient>, order: Order) {
  queryClient.setQueryData(keys.order(order.id), order);
  void queryClient.invalidateQueries({ queryKey: keys.orders, exact: true });
}
